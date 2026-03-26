/**
 * ggml-numa-shard.h
 * 
 * NUMA-Aware Model Sharding for POWER8 llama.cpp
 * 
 * Implements intelligent per-layer NUMA placement for IBM POWER8 S824
 * with 4 NUMA nodes (512GB RAM total).
 * 
 * Compilation (POWER8):
 *   gcc -O3 -mcpu=power8 -mvsx -lnuma -lpthread -o test ggml-numa-shard.c
 * 
 * Compilation (x86, no-op):
 *   gcc -O3 -lnuma -lpthread -o test ggml-numa-shard.c
 * 
 * Environment Variables:
 *   GGML_NUMA_SHARD_MAP - Layer to NUMA node mapping
 *   Example: GGML_NUMA_SHARD_MAP="0-8:node0,9-20:node1,21-31:node2,attn:node3"
 * 
 * Bounty: https://github.com/Scottcjn/rustchain-bounties/issues/2277
 * Author: NUMA-Shard Implementation
 */

#ifndef GGML_NUMA_SHARD_H
#define GGML_NUMA_SHARD_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stddef.h>

/*============================================================================
 * Platform Detection and NUMA Support
 *============================================================================*/

#ifdef __powerpc64__
    #define GGML_NUMA_POWER8 1
    #include <sched.h>
    #include <numa.h>
    #include <numaif.h>
    #include <sys/mman.h>
    #include <unistd.h>
#else
    #define GGML_NUMA_POWER8 0
#endif

/*============================================================================
 * Configuration Constants
 *============================================================================*/

/* POWER8 S824 NUMA Topology (4 nodes, 512GB RAM) */
/* Node 2/3 are fastest (400-425 MB/s), Node 0 slowest (215-225 MB/s) */
#define GGML_NUMA_MAX_NODES      4
#define GGML_NUMA_NODE_FAST_MIN 2  /* Nodes 2-3 are fast */
#define GGML_NUMA_NODE_FAST_MAX 3
#define GGML_NUMA_NODE_SLOW_MAX 1  /* Nodes 0-1 are slower */

#define GGML_NUMA_MAX_LAYERS     128
#define GGML_NUMA_MAX_TENSORS    4096
#define GGML_NUMA_NAME_LEN       64
#define GGML_NUMA_MAP_STR_LEN    512

/*============================================================================
 * GGUF Tensor Types (from llama.cpp gguf.h)
 *============================================================================*/

enum ggml_numa_tensor_type {
    GGML_NUMA_TENSOR_TYPE_F32  = 0,
    GGML_NUMA_TENSOR_TYPE_F16  = 1,
    GGML_NUMA_TENSOR_TYPE_Q4_0 = 2,
    GGML_NUMA_TENSOR_TYPE_Q4_1 = 3,
    GGML_NUMA_TENSOR_TYPE_Q5_0 = 4,
    GGML_NUMA_TENSOR_TYPE_Q5_1 = 5,
    GGML_NUMA_TENSOR_TYPE_Q8_0 = 6,
    GGML_NUMA_TENSOR_TYPE_Q8_1 = 7,
    GGML_NUMA_TENSOR_TYPE_Q2_K = 8,
    GGML_NUMA_TENSOR_TYPE_Q3_K = 9,
    GGML_NUMA_TENSOR_TYPE_Q4_K = 10,
    GGML_NUMA_TENSOR_TYPE_Q5_K = 11,
    GGML_NUMA_TENSOR_TYPE_Q6_K = 12,
    GGML_NUMA_TENSOR_TYPE_Q8_K = 13,
    GGML_NUMA_TENSOR_TYPE_I8   = 14,
    GGML_NUMA_TENSOR_TYPE_I16  = 15,
    GGML_NUMA_TENSOR_TYPE_I32  = 16,
    GGML_NUMA_TENSOR_TYPE_I64  = 17,
    GGML_NUMA_TENSOR_TYPE_F64  = 18,
    GGML_NUMA_TENSOR_TYPE_BF16 = 19,
    GGML_NUMA_TENSOR_TYPE_COUNT = 20
};

/* GGUF metadata keys */
#define GGML_NUMA_KEY_NAME         "name"
#define GGML_NUMA_KEY_LAYER_NAMES  "layer_names"
#define GGML_NUMA_KEY_TENSOR_DATA  "tensor_data"
#define GGML_NUMA_KEY_LAYER_PREFIX "layer."

/*============================================================================
 * Data Structures
 *============================================================================*/

/* NUMA node information */
typedef struct {
    int node_id;
    size_t total_mem;
    size_t free_mem;
    double bandwidth_mbps;  /* Measured bandwidth */
    int is_fast;            /* 1 if high bandwidth node */
} ggml_numa_node_info_t;

/* Tensor metadata from GGUF */
typedef struct {
    char name[GGML_NUMA_NAME_LEN];
    int64_t dimensions[4];
    int n_dimensions;
    enum ggml_numa_tensor_type tensor_type;
    size_t offset;          /* Offset in file */
    size_t size;            /* Size in bytes */
    int layer_idx;          /* -1 if not a layer tensor */
    int is_attention;       /* Attention layer marker */
    int is_ffn;             /* FFN layer marker */
} ggml_numa_tensor_t;

/* Layer assignment */
typedef struct {
    int layer_idx;
    int numa_node;          /* Target NUMA node (0-3) */
    int tensor_count;
    size_t total_size;
} ggml_numa_layer_assignment_t;

/* NUMA shard configuration */
typedef struct {
    int enabled;
    int numa_node_count;
    int default_node;
    char map_str[GGML_NUMA_MAP_STR_LEN];
    
    ggml_numa_node_info_t nodes[GGML_NUMA_MAX_NODES];
    
    /* Layer assignments (layer_idx -> numa_node) */
    int layer_to_node[GGML_NUMA_MAX_LAYERS];
    
    /* Per-node statistics */
    size_t node_memory_used[GGML_NUMA_MAX_NODES];
    size_t node_tensor_count[GGML_NUMA_MAX_NODES];
} ggml_numa_config_t;

/* Shard statistics */
typedef struct {
    uint64_t total_tensors;
    uint64_t total_layers;
    uint64_t total_memory_bytes;
    
    double numa_bind_time_ms;
    double parse_time_ms;
    
    int shard_violations;     /* Cross-node accesses */
    size_t cross_node_bytes;
} ggml_numa_stats_t;

/*============================================================================
 * GGUF Parsing Functions
 *============================================================================*/

/**
 * Parse GGUF file and extract tensor metadata
 * 
 * @param gguf_path Path to GGUF model file
 * @param tensors Output array of tensor metadata
 * @param max_tensors Maximum number of tensors to parse
 * @return Number of tensors parsed, or -1 on error
 */
int ggml_numa_parse_gguf(
    const char* gguf_path,
    ggml_numa_tensor_t* tensors,
    size_t max_tensors
);

/**
 * Identify transformer layers from tensor names
 * 
 * @param tensors Array of parsed tensors
 * @param count Number of tensors
 * @return Number of transformer layers identified
 */
int ggml_numa_identify_layers(
    ggml_numa_tensor_t* tensors,
    size_t count
);

/**
 * Parse layer type from tensor name
 * 
 * @param name Tensor name
 * @return 1 if attention, 2 if FFN, 0 otherwise
 */
int ggml_numa_parse_layer_type(const char* name);

/*============================================================================
 * NUMA Placement Functions
 *============================================================================*/

/**
 * Initialize NUMA configuration
 * 
 * @param config Output configuration
 * @param map_str Optional shard map string (NULL for defaults)
 * @return 0 on success, -1 on error
 */
int ggml_numa_init(
    ggml_numa_config_t* config,
    const char* map_str
);

/**
 * Detect NUMA topology and populate node info
 * 
 * @param config NUMA configuration
 * @return Number of NUMA nodes detected
 */
int ggml_numa_detect_topology(ggml_numa_config_t* config);

/**
 * Get NUMA node for a specific layer based on access pattern
 * 
 * Access pattern strategy:
 * - Early layers (0-8): Node 1 (warm-up, moderate bandwidth)
 * - Attention layers: Node 3 (high bandwidth, low latency)
 * - FFN layers: Node 2 (high bandwidth)
 * - Late layers (剩余): Node 0 or 1
 * 
 * @param config NUMA configuration
 * @param layer_idx Layer index
 * @param layer_type Layer type (0=other, 1=attention, 2=FFN)
 * @return NUMA node ID (0-3)
 */
int ggml_numa_get_node(
    ggml_numa_config_t* config,
    int layer_idx,
    int layer_type
);

/**
 * Bind memory to specific NUMA node
 * 
 * @param ptr Memory pointer
 * @param size Size of memory region
 * @param node Target NUMA node
 * @return 0 on success, -1 on error
 */
int ggml_numa_bind_memory(
    void* ptr,
    size_t size,
    int node
);

/**
 * Move pages of memory to target NUMA node (for existing allocations)
 * 
 * @param ptr Memory pointer
 * @param size Size of memory region
 * @param node Target NUMA node
 * @param nodemask Node mask for mbind
 * @return Number of pages moved, -1 on error
 */
long ggml_numa_move_pages(
    void* ptr,
    size_t size,
    int node
);

/**
 * Parse shard map string
 * 
 * Format: "0-8:node0,9-20:node1,21-31:node2,attn:node3"
 * 
 * @param config NUMA configuration
 * @param map_str Shard map string
 * @return 0 on success, -1 on parse error
 */
int ggml_numa_parse_map(
    ggml_numa_config_t* config,
    const char* map_str
);

/*============================================================================
 * Model Sharding Functions
 *============================================================================*/

/**
 * Apply NUMA sharding to a loaded model
 * 
 * @param config NUMA configuration
 * @param tensors Array of model tensors
 * @param count Number of tensors
 * @param model_data Base pointer to model memory
 * @return 0 on success, -1 on error
 */
int ggml_numaShard_model(
    ggml_numa_config_t* config,
    ggml_numa_tensor_t* tensors,
    size_t count,
    void* model_data
);

/**
 * Calculate optimal shard distribution
 * 
 * Balances memory across nodes while respecting access patterns.
 * 
 * @param config NUMA configuration
 * @param tensors Array of model tensors
 * @param count Number of tensors
 * @param assignments Output layer assignments
 * @return Number of assignments, -1 on error
 */
int ggml_numa_calculate_shards(
    ggml_numa_config_t* config,
    ggml_numa_tensor_t* tensors,
    size_t count,
    ggml_numa_layer_assignment_t* assignments
);

/*============================================================================
 * Statistics and Benchmarking
 *============================================================================*/

/**
 * Get NUMA sharding statistics
 * 
 * @param stats Output statistics structure
 */
void ggml_numa_get_stats(ggml_numa_stats_t* stats);

/**
 * Print NUMA topology
 * 
 * @param config NUMA configuration
 */
void ggml_numa_print_topology(const ggml_numa_config_t* config);

/**
 * Print shard assignment summary
 * 
 * @param config NUMA configuration
 * @param assignments Layer assignments
 * @param count Number of assignments
 */
void ggml_numa_print_shard_summary(
    const ggml_numa_config_t* config,
    const ggml_numa_layer_assignment_t* assignments,
    size_t count
);

/*============================================================================
 * Utility Functions
 *============================================================================*/

/**
 * Check if running on POWER8
 * 
 * @return 1 if POWER8, 0 otherwise
 */
int ggml_numa_is_power8(void);

/**
 * Get optimal thread count for POWER8 NUMA
 * 
 * Based on testing: 64 threads optimal (NOT 128)
 * 
 * @param numa_node Optional NUMA node hint
 * @return Recommended thread count
 */
int ggml_numa_optimal_threads(int numa_node);

/**
 * Reset NUMA statistics
 */
void ggml_numa_reset_stats(void);

/*============================================================================
 * Inline Helpers (Power8 Optimized)
 *============================================================================*/

#if GGML_NUMA_POWER8

/* Get preferred NUMA node for current thread */
static inline int ggml_numa_get_local_node(void) {
    return numa_node_of_cpu(sched_getcpu());
}

/* Prefetch tensor to local NUMA node */
static inline void ggml_numa_prefetch_to_node(
    const void* addr,
    size_t size,
    int node
) {
    if (addr == NULL || size == 0) return;
    
    /* Use mbind with MPOL_PREFERRED for soft binding */
    unsigned long nodemask = (1UL << node);
    set_mempolicy(MPOL_PREFERRED, &nodemask, sizeof(nodemask) * 8);
    
    /* Touch pages to ensure allocation on target node */
    volatile char* p = (volatile char*)addr;
    for (size_t i = 0; i < size; i += 4096) {
        (void)p[i];
    }
}

#else

/* x86 no-op implementations */
static inline int ggml_numa_get_local_node(void) { return 0; }
static inline void ggml_numa_prefetch_to_node(
    const void* addr, size_t size, int node
) { (void)addr; (void)size; (void)node; }

#endif

#ifdef __cplusplus
}
#endif

#endif /* GGML_NUMA_SHARD_H */
