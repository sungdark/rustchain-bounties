#!/bin/bash
#
# ggml-numa-benchmark.sh
#
# Benchmark harness for NUMA-aware model sharding
# Compares pp512 and tg128 throughput: flat mmap vs NUMA-sharded
#
# Usage:
#   ./benchmark.sh [model_path] [--pp512] [--tg128]
#
# Bounty: https://github.com/Scottcjn/rustchain-bounties/issues/2277

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default settings
MODEL_PATH="${1:-}"
PP_SIZE="${PP_SIZE:-512}"
TG_SIZE="${TG_SIZE:-128}"
THREADS="${THREADS:-64}"  # 64 threads optimal (NOT 128)
NUMA_MAP="${GGML_NUMA_SHARD_MAP:-0-8:node1,9-20:node3,21-31:node2,attn:node3,ffn:node2}"

# Model sizes for testing
TEST_7B="llama-2-7b-chat.Q4_K_M.gguf"
TEST_33B="llama-2-33b-chat.Q4_K_M.gguf"

# Output file
RESULTS_FILE="numa_benchmark_results_$(date +%Y%m%d_%H%M%S).json"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_deps() {
    log_info "Checking dependencies..."
    
    local missing=()
    
    # Check for llama.cpp binary (llama-cli or similar)
    if ! command -v llama-cli &> /dev/null && ! command -v main &> /dev/null; then
        # Check if we're in a llama.cpp build directory
        if [ ! -f "./build/bin/llama-cli" ]; then
            missing+=("llama-cli")
        fi
    fi
    
    # Check for numactl
    if ! command -v numactl &> /dev/null; then
        missing+=("numactl")
    fi
    
    # Check for numa.h (libnuma-dev)
    if ! pkg-config --exists libnuma 2>/dev/null && [ ! -f /usr/include/numa.h ]; then
        missing+=("libnuma-dev")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_info "Install with: sudo apt-get install numactl libnuma-dev"
        return 1
    fi
    
    log_info "All dependencies available"
    return 0
}

get_numa_nodes() {
    if command -v numactl &> /dev/null; then
        numactl --hardware | grep "available:" | awk '{print $2}'
    else
        echo "1"  # Single node fallback
    fi
}

get_node_memory() {
    local node=$1
    if command -v numactl &> /dev/null; then
        numactl --show | grep "node $node size" || echo "0"
    else
        echo "0"
    fi
}

print_numa_topology() {
    log_info "NUMA Topology:"
    if command -v numactl &> /dev/null; then
        numactl --hardware
    else
        echo "  numactl not available, assuming single-node"
    fi
}

#-------------------------------------------------------------------------------
# Benchmark Functions
#-------------------------------------------------------------------------------

run_benchmark_flat() {
    local model=$1
    local pp=$2
    local tg=$3
    local threads=$4
    
    log_info "Running FLAT (non-NUMA) benchmark..."
    log_info "  Model: $model"
    log_info "  PP: $pp, TG: $tg, Threads: $threads"
    
    # Disable NUMA sharding for this run
    export GGML_NUMA_ENABLED=0
    
    # Run with flat mmap
    local start_time=$(date +%s.%N)
    
    # Note: Actual llama-cli invocation depends on your llama.cpp build
    # This is a template - adjust paths as needed
    if [ -f "./build/bin/llama-cli" ]; then
        ./build/bin/llama-cli \
            -m "$model" \
            -p "Hello, how are you?" \
            -t "$threads" \
            --pp "$pp" \
            --tg "$tg" \
            -n 256 \
            2>&1 | tee "benchmark_flat_$$.log"
    else
        log_warn "llama-cli not found, using mock benchmark"
        sleep 2
        echo "MOCK: Flat mmap benchmark complete"
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Extract throughput (tokens/sec) from log if available
    local throughput=$(grep -oP 't/s.*?(\d+\.?\d*)' "benchmark_flat_$$.log" 2>/dev/null || echo "0")
    
    echo "{\"mode\":\"flat\",\"duration\":$duration,\"throughput\":$throughput,\"pp\":$pp,\"tg\":$tg}"
}

run_benchmark_numa() {
    local model=$1
    local pp=$2
    local tg=$3
    local threads=$4
    local numa_map=$5
    
    log_info "Running NUMA-SHARDED benchmark..."
    log_info "  Model: $model"
    log_info "  PP: $pp, TG: $tg, Threads: $threads"
    log_info "  NUMA Map: $numa_map"
    
    # Enable NUMA sharding
    export GGML_NUMA_ENABLED=1
    export GGML_NUMA_SHARD_MAP="$numa_map"
    
    # Run with NUMA-aware sharding
    local start_time=$(date +%s.%N)
    
    if [ -f "./build/bin/llama-cli" ]; then
        # Pin to all NUMA nodes with interleaving for comparison
        numactl --interleave=all \
            ./build/bin/llama-cli \
            -m "$model" \
            -p "Hello, how are you?" \
            -t "$threads" \
            --pp "$pp" \
            --tg "$tg" \
            -n 256 \
            2>&1 | tee "benchmark_numa_$$.log"
    else
        log_warn "llama-cli not found, using mock benchmark"
        sleep 2
        echo "MOCK: NUMA-sharded benchmark complete"
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Extract throughput from log
    local throughput=$(grep -oP 't/s.*?(\d+\.?\d*)' "benchmark_numa_$$.log" 2>/dev/null || echo "0")
    
    echo "{\"mode\":\"numa\",\"duration\":$duration,\"throughput\":$throughput,\"pp\":$pp,\"tg\":$tg,\"numa_map\":\"$numa_map\"}"
}

measure_bandwidth() {
    local node=$1
    log_info "Measuring memory bandwidth for Node $node..."
    
    # Use numactl to pin memory and run bandwidth test
    # This is a simplified version - real implementation would use mbw or similar
    if command -v numactl &> /dev/null; then
        numactl --membind=$node --cpunodebind=$node \
            dd if=/dev/zero of=/dev/null bs=1M count=8192 2>&1 | grep -oP '\d+.*MB/s'
    else
        echo "300 MB/s (estimated)"
    fi
}

print_node_bandwidths() {
    log_info "Per-Node Memory Bandwidth:"
    local num_nodes=$(get_numa_nodes)
    
    for ((i=0; i<num_nodes; i++)); do
        local bw=$(measure_bandwidth $i)
        echo "  Node $i: $bw"
    done
}

generate_report() {
    local model=$1
    local flat_tput=$2
    local numa_tput=$3
    local pp=$4
    local tg=$5
    
    local improvement=$(echo "scale=2; ($numa_tput - $flat_tput) / $flat_tput * 100" | bc 2>/dev/null || echo "0")
    
    cat > "$RESULTS_FILE" << EOF
{
  "benchmark": "NUMA-Aware Model Sharding",
  "date": "$(date -Iseconds)",
  "model": "$model",
  "parameters": {
    "pp_size": $pp,
    "tg_size": $tg,
    "threads": $THREADS,
    "numa_nodes": $(get_numa_nodes)
  },
  "results": {
    "flat_mmap": {
      "throughput_tps": $flat_tput
    },
    "numa_sharded": {
      "throughput_tps": $numa_tput,
      "improvement_percent": $improvement
    }
  },
  "numa_map": "$NUMA_MAP"
}
EOF
    
    log_info "Results written to $RESULTS_FILE"
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------

main() {
    echo "=========================================="
    echo " GGML NUMA-Aware Model Sharding Benchmark"
    echo "=========================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --pp512)
                PP_SIZE=512
                shift
                ;;
            --tg128)
                TG_SIZE=128
                shift
                ;;
            --threads)
                THREADS=$2
                shift 2
                ;;
            --numa-map)
                NUMA_MAP=$2
                shift 2
                ;;
            *)
                MODEL_PATH=$1
                shift
                ;;
        esac
    done
    
    # Check dependencies
    check_deps || exit 1
    
    # Print environment
    echo "Environment:"
    echo "  GGML_NUMA_SHARD_MAP=$NUMA_MAP"
    echo "  THREADS=$THREADS"
    echo "  PP_SIZE=$PP_SIZE"
    echo "  TG_SIZE=$TG_SIZE"
    echo ""
    
    # Print NUMA topology
    print_numa_topology
    echo ""
    
    # Print per-node bandwidth
    print_node_bandwidths
    echo ""
    
    # Determine model to test
    if [ -z "$MODEL_PATH" ]; then
        log_warn "No model path provided, using mock mode"
        MODEL_PATH="mock_model.gguf"
    fi
    
    # Run benchmarks
    local flat_result
    local numa_result
    
    log_info "Running FLAT benchmark (baseline)..."
    flat_result=$(run_benchmark_flat "$MODEL_PATH" "$PP_SIZE" "$TG_SIZE" "$THREADS")
    echo "$flat_result"
    
    log_info "Running NUMA-SHARDED benchmark..."
    numa_result=$(run_benchmark_numa "$MODEL_PATH" "$PP_SIZE" "$TG_SIZE" "$THREADS" "$NUMA_MAP")
    echo "$numa_result"
    
    # Extract throughputs
    local flat_tput=$(echo "$flat_result" | grep -oP '"throughput":\K\d+\.?\d*' || echo "0")
    local numa_tput=$(echo "$numa_result" | grep -oP '"throughput":\K\d+\.?\d*' || echo "0")
    
    # Generate report
    generate_report "$MODEL_PATH" "$flat_tput" "$numa_tput" "$PP_SIZE" "$TG_SIZE"
    
    echo ""
    echo "=========================================="
    log_info "Benchmark Complete!"
    echo "=========================================="
    echo ""
    echo "Summary:"
    echo "  Flat (mmap):     $flat_tput t/s"
    echo "  NUMA-Sharded:    $numa_tput t/s"
    
    if command -v bc &> /dev/null && [ "$flat_tput" != "0" ]; then
        local improvement=$(echo "scale=2; ($numa_tput - $flat_tput) / $flat_tput * 100" | bc)
        echo "  Improvement:    $improvement%"
    fi
}

# Run main
main "$@"
