# NUMA-Aware Model Sharding for POWER8 llama.cpp

**Bounty Issue:** [#2277](https://github.com/Scottcjn/rustchain-bounties/issues/2277)  
**Reward:** 250 RTC  
**Payment Address:** eB51DWp1uECrLZRLsE2cnyZUzfRWvzUzaJzkatTpQV9  
**Difficulty:** EXTREME

## Overview

This implementation provides NUMA-aware model sharding for llama.cpp running on IBM POWER8 S824 servers. The POWER8 S824 has 512GB RAM across 4 NUMA nodes, and this solution optimizes per-layer memory placement for maximum throughput.

## NUMA Topology (POWER8 S824)

| Node | Bandwidth    | Latency | Best For          |
|------|-------------|---------|-------------------|
| 0    | 215-225 MB/s | High   | Early layers      |
| 1    | 215-225 MB/s | High   | Early layers      |
| 2    | 400-425 MB/s | Low    | FFN layers        |
| 3    | 400-425 MB/s | Low    | Attention layers  |

**Key Finding:** 64 threads is optimal (NOT 128)

## Features

### 1. NUMA Layer Router (`ggml-numa-shard.h`)

- **GGUF Tensor Parsing**: Identifies transformer layers from GGUF model files
- **Layer Classification**: Categorizes tensors as attention, FFN, or other
- **NUMA-Aware Memory Binding**: Uses `mbind()` and `move_pages()` to pin memory

### 2. Configurable Shard Mapping

```bash
export GGML_NUMA_SHARD_MAP="0-8:node1,9-20:node3,21-31:node2,attn:node3,ffn:node2"
```

Format: `layer-range:node,layer-type:node,...`

- `0-8:node1` - Early layers (0-8) → Node 1
- `9-20:node3` - Mid layers (9-20) → Node 3 (attention)
- `21-31:node2` - Late layers (21-31) → Node 2 (FFN)
- `attn:node3` - All attention layers → Node 3
- `ffn:node2` - All FFN layers → Node 2

### 3. Access Pattern Strategy

| Layer Type | NUMA Node | Rationale                          |
|------------|----------|-------------------------------------|
| Embeddings | 1        | Warm-up, moderate bandwidth         |
| Early (0-8)| 1        | Initial processing                 |
| Attention  | 3        | Highest bandwidth, low latency     |
| FFN        | 2        | High bandwidth, compute intensive  |
| Late       | 2        | Final layers, benefits from fast node |

## Compilation

### POWER8 (with NUMA support)

```bash
# Requires: libnuma-dev, GCC 9+
gcc -O3 \
    -mcpu=power8 -mvsx \
    -lnuma -lpthread \
    -o test \
    ggml-numa-shard.c

# Run test
./test
```

### x86 (no-op, safe fallback)

```bash
# Standard compilation, NUMA functions become no-ops
gcc -O3 -lnuma -lpthread -o test ggml-numa-shard.c
```

The code uses `#ifdef __powerpc64__` guards to ensure x86 builds are unaffected.

## Usage

### Integration with llama.cpp

```c
#include "ggml-numa-shard.h"

int main() {
    // Initialize NUMA configuration
    ggml_numa_config_t config;
    ggml_numa_init(&config, NULL);
    
    // Print detected topology
    ggml_numa_print_topology(&config);
    
    // Parse GGUF model
    ggml_numa_tensor_t tensors[4096];
    int count = ggml_numa_parse_gguf("model.gguf", tensors, 4096);
    
    // Identify layers
    ggml_numa_identify_layers(tensors, count);
    
    // Calculate optimal shard distribution
    ggml_numa_layer_assignment_t assignments[128];
    int num_assignments = ggml_numa_calculate_shards(&config, tensors, count, assignments);
    
    // Apply NUMA sharding
    void* model_data = load_model("model.gguf");
    ggml_numaShard_model(&config, tensors, count, model_data);
    
    // Print summary
    ggml_numa_print_shard_summary(&config, assignments, num_assignments);
    
    return 0;
}
```

### Environment Variables

| Variable            | Default | Description                           |
|---------------------|---------|---------------------------------------|
| `GGML_NUMA_ENABLED` | 1       | Enable/disable NUMA sharding          |
| `GGML_NUMA_SHARD_MAP` | auto   | Layer-to-node mapping                 |
| `GGML_NUMA_THREADS` | 64      | Thread count (64 optimal on POWER8)   |

## Benchmark Harness

Run comparative benchmarks:

```bash
# Basic benchmark
./benchmark.sh model.gguf

# With specific parameters
./benchmark.sh model.gguf --pp512 --tg128 --threads 64

# With custom NUMA map
GGML_NUMA_SHARD_MAP="0-15:node1,16-31:node3" ./benchmark.sh model.gguf
```

### Benchmark Output

The harness generates a JSON report comparing:
- **Flat mmap**: Baseline throughput (t/s)
- **NUMA-sharded**: Optimized throughput (t/s)
- **Improvement %**: Performance gain

## Files

| File                  | Description                              |
|-----------------------|------------------------------------------|
| `ggml-numa-shard.h`   | Header file with API and inline helpers  |
| `ggml-numa-shard.c`   | Implementation of NUMA functions         |
| `benchmark.sh`        | Benchmark harness for comparison testing |
| `README.md`           | This file                                |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      llama.cpp Model                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 0-8  │  Layer 9-20  │  Layer 21-31  │   Attention    │
│   (Node 1)  │   (Node 3)   │   (Node 2)    │    (Node 3)    │
├─────────────┼──────────────┼───────────────┼────────────────┤
│    215      │     425      │      400      │      425       │
│   MB/s      │    MB/s      │     MB/s      │     MB/s       │
└─────────────┴──────────────┴───────────────┴────────────────┘
        ▼              ▼              ▼              ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
   │  Node 1 │    │  Node 3 │    │  Node 2 │    │  Node 3 │
   │ (Slower)│    │ (Fastest)│   │ (Fast)  │    │ (Fastest)│
   └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

## Testing

### Unit Test

```bash
gcc -DGGML_NUMA_MAIN -O3 -o test ggml-numa-shard.c
./test
```

Expected output:
```
GGML NUMA-Shard Test
====================
NUMA Nodes: 4
Sharding Enabled: Yes
Node 0: Fast Node: No
Node 1: Fast Node: No
Node 2: Fast Node: Yes (400 MB/s)
Node 3: Fast Node: Yes (425 MB/s)
```

### Cross-Platform Test

Verify x86 build works without NUMA:

```bash
# On x86 machine
gcc -O3 -o test_x86 ggml-numa-shard.c
./test_x86
# Should show "NUMA sharding disabled" or similar
```

## Performance Notes

- **Optimal Threads**: 64 (not 128)
- **Current Peak**: 147.54 t/s on TinyLlama 1.1B with PSE + resident prefetch
- **Expected Improvement**: 10-30% with NUMA sharding on 33B models
- **Memory Binding**: Can take 100-500ms for large models, amortized over inference

## Limitations

- Requires POWER8 or NUMA-enabled system for actual NUMA binding
- x86 builds compile successfully but NUMA functions are no-ops
- GGUF parsing is simplified; full implementation may need adaptation
- Benchmark harness requires llama.cpp binary (`llama-cli`)

## Contributing

This implementation follows the bounty requirements. For questions or access to the POWER8 test server, open an issue on the parent repository.

## License

Same as llama.cpp (Apache 2.0)

---

**Payment Address:** eB51DWp1uECrLZRLsE2cnyZUzfRWvzUzaJzkatTpQV9
