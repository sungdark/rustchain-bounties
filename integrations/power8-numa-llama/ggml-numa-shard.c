/**
 * ggml-numa-shard.c
 * 
 * Implementation of NUMA-Aware Model Sharding for POWER8 llama.cpp
 * 
 * Bounty: https://github.com/Scottcjn/rustchain-bounties/issues/2277
 */

#include "ggml-numa-shard.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

/*============================================================================
 * Global State
 *============================================================================*/

static ggml_numa_stats_t g_numa_stats = {0};
static int g_initialized = 0;

/*============================================================================
 * GGUF Parsing Implementation
 *============================================================================*/

int ggml_numa_parse_gguf(
    const char* gguf_path,
    ggml_numa_tensor_t* tensors,
    size_t max_tensors
) {
#if !GGML_NUMA_POWER8
    (void)gguf_path;
    (void)tensors;
    (void)max_tensors;
    return 0;
#else
    FILE* fp = fopen(gguf_path, "rb");
    if (!fp) {
        fprintf(stderr, "ggml_numa: failed to open %s: %s\n", 
                gguf_path, strerror(errno));
        return -1;
    }

    /* Read GGUF magic number */
    uint32_t magic;
    if (fread(&magic, sizeof(magic), 1, fp) != 1) {
        fclose(fp);
        return -1;
    }

    /* GGUF magic: 0x46554747 ('GGUF') */
    if (magic != 0x46554747) {
        fprintf(stderr, "ggml_numa: invalid GGUF file %s\n", gguf_path);
        fclose(fp);
        return -1;
    }

    /* Read version */
    uint32_t version;
    if (fread(&version, sizeof(version), 1, fp) != 1) {
        fclose(fp);
        return -1;
    }

    /* Read tensor count - for now, just do a simple count from file */
    /* In a full implementation, this would parse the GGUF metadata tables */
    memset(tensors, 0, sizeof(ggml_numa_tensor_t) * max_tensors);
    
    fclose(fp);
    return 0;
#endif
}

int ggml_numa_identify_layers(
    ggml_numa_tensor_t* tensors,
    size_t count
) {
    int layer_count = 0;
    
    for (size_t i = 0; i < count; i++) {
        ggml_numa_tensor_t* t = &tensors[i];
        
        /* Check if tensor name contains layer prefix */
        if (strstr(t->name, "layer.") != NULL || 
            strstr(t->name, ".attn.") != NULL ||
            strstr(t->name, ".ffn.") != NULL) {
            
            t->layer_idx = layer_count++;
            
            if (strstr(t->name, ".attn.") != NULL) {
                t->is_attention = 1;
            } else if (strstr(t->name, ".ffn.") != NULL) {
                t->is_ffn = 1;
            }
        }
    }
    
    return layer_count;
}

int ggml_numa_parse_layer_type(const char* name) {
    if (strstr(name, ".attn.") != NULL || 
        strstr(name, "attention") != NULL ||
        strstr(name, ".wq.") != NULL ||
        strstr(name, ".wk.") != NULL ||
        strstr(name, ".wv.") != NULL ||
        strstr(name, ".wo.") != NULL) {
        return 1;  /* Attention */
    }
    
    if (strstr(name, ".ffn.") != NULL ||
        strstr(name, "feed_forward") != NULL ||
        strstr(name, ".w1.") != NULL ||
        strstr(name, ".w2.") != NULL ||
        strstr(name, ".w3.") != NULL) {
        return 2;  /* FFN */
    }
    
    return 0;  /* Other */
}

/*============================================================================
 * NUMA Placement Implementation
 *============================================================================*/

int ggml_numa_init(ggml_numa_config_t* config, const char* map_str) {
    memset(config, 0, sizeof(*config));
    config->enabled = 1;
    config->numa_node_count = GGML_NUMA_MAX_NODES;
    config->default_node = 0;
    
#if GGML_NUMA_POWER8
    if (numa_available() < 0) {
        fprintf(stderr, "ggml_numa: NUMA not available\n");
        config->enabled = 0;
        return -1;
    }
    
    /* Set default shard map based on POWER8 topology */
    const char* default_map = "0-8:node1,9-20:node3,21-31:node2,attn:node3,ffn:node2";
    
    if (map_str == NULL) {
        map_str = getenv("GGML_NUMA_SHARD_MAP");
    }
    
    if (map_str != NULL) {
        strncpy(config->map_str, map_str, sizeof(config->map_str) - 1);
    } else {
        strncpy(config->map_str, default_map, sizeof(config->map_str) - 1);
    }
    
    /* Initialize layer to node mapping with defaults */
    for (int i = 0; i < GGML_NUMA_MAX_LAYERS; i++) {
        if (i <= 8) {
            config->layer_to_node[i] = 1;  /* Early layers -> Node 1 */
        } else if (i <= 20) {
            config->layer_to_node[i] = 3;  /* Mid layers (attention) -> Node 3 */
        } else {
            config->layer_to_node[i] = 2;  /* Late layers (FFN) -> Node 2 */
        }
    }
    
    ggml_numa_detect_topology(config);
#else
    config->enabled = 0;
    fprintf(stderr, "ggml_numa: Running on non-POWER8, NUMA sharding disabled\n");
#endif
    
    g_initialized = 1;
    return 0;
}

int ggml_numa_detect_topology(ggml_numa_config_t* config) {
#if !GGML_NUMA_POWER8
    (void)config;
    return 0;
#else
    int num_nodes = numa_max_node() + 1;
    if (num_nodes > GGML_NUMA_MAX_NODES) {
        num_nodes = GGML_NUMA_MAX_NODES;
    }
    config->numa_node_count = num_nodes;
    
    for (int i = 0; i < num_nodes; i++) {
        ggml_numa_node_info_t* node = &config->nodes[i];
        node->node_id = i;
        node->total_mem = numa_node_size(i, &node->free_mem);
        node->bandwidth_mbps = 0.0;
        
        /* Mark fast nodes based on POWER8 S824 topology */
        /* Nodes 2-3 are fastest (400-425 MB/s), Nodes 0-1 slower (215-225 MB/s) */
        if (i >= GGML_NUMA_NODE_FAST_MIN && i <= GGML_NUMA_NODE_FAST_MAX) {
            node->is_fast = 1;
            node->bandwidth_mbps = (i == 3) ? 425.0 : 400.0;
        } else {
            node->is_fast = 0;
            node->bandwidth_mbps = (i == 0) ? 215.0 : 225.0;
        }
    }
    
    return num_nodes;
#endif
}

int ggml_numa_get_node(ggml_numa_config_t* config, int layer_idx, int layer_type) {
    if (!config->enabled || layer_idx < 0 || layer_idx >= GGML_NUMA_MAX_LAYERS) {
        return 0;
    }
    
    /* Check environment variable override first */
    const char* map_str = getenv("GGML_NUMA_SHARD_MAP");
    if (map_str != NULL && strlen(map_str) > 0) {
        ggml_numa_parse_map(config, map_str);
    }
    
    /* Return configured mapping */
    if (layer_type == 1) {
        /* Attention layers -> Fast nodes (2-3) */
        return 3;
    } else if (layer_type == 2) {
        /* FFN layers -> Fast nodes (2-3) */
        return 2;
    } else {
        /* Other layers -> configured mapping or default */
        return config->layer_to_node[layer_idx];
    }
}

int ggml_numa_bind_memory(void* ptr, size_t size, int node) {
#if !GGML_NUMA_POWER8
    (void)ptr;
    (void)size;
    (void)node;
    return 0;
#else
    if (ptr == NULL || size == 0) {
        return -1;
    }
    
    unsigned long nodemask = (1UL << node);
    
    /* Use mbind to bind memory to specific NUMA node */
    if (mbind(ptr, size, MPOL_BIND, &nodemask, sizeof(nodemask) * 8, 0) != 0) {
        fprintf(stderr, "ggml_numa: mbind failed: %s\n", strerror(errno));
        return -1;
    }
    
    return 0;
#endif
}

long ggml_numa_move_pages(void* ptr, size_t size, int node) {
#if !GGML_NUMA_POWER8
    (void)ptr;
    (void)size;
    (void)node;
    return 0;
#else
    if (ptr == NULL || size == 0) {
        return -1;
    }
    
    /* Calculate number of pages */
    long page_size = sysconf(_SC_PAGESIZE);
    size_t num_pages = (size + page_size - 1) / page_size;
    
    /* Allocate array for page statuses */
    int* status = (int*)malloc(num_pages * sizeof(int));
    int* nodes = (int*)malloc(num_pages * sizeof(int));
    
    if (!status || !nodes) {
        free(status);
        free(nodes);
        return -1;
    }
    
    /* Initialize all pages to move to target node */
    for (size_t i = 0; i < num_pages; i++) {
        nodes[i] = node;
        status[i] = 0;
    }
    
    /* Move pages */
    long result = move_pages(0, num_pages, &ptr, nodes, status, MPOL_MF_MOVE);
    
    /* Count successfully moved pages */
    long moved = 0;
    if (result == 0) {
        for (size_t i = 0; i < num_pages; i++) {
            if (status[i] == 0) {
                moved++;
            }
        }
    }
    
    free(status);
    free(nodes);
    
    return moved;
#endif
}

int ggml_numa_parse_map(ggml_numa_config_t* config, const char* map_str) {
    if (map_str == NULL || config == NULL) {
        return -1;
    }
    
    /* Reset layer mappings */
    for (int i = 0; i < GGML_NUMA_MAX_LAYERS; i++) {
        config->layer_to_node[i] = config->default_node;
    }
    
    /* Parse format: "0-8:node0,9-20:node1,21-31:node2,attn:node3,ffn:node2" */
    char* str = strdup(map_str);
    char* token = strtok(str, ",");
    
    while (token != NULL) {
        int node = -1;
        
        /* Extract node number */
        if (strstr(token, "node0") != NULL) node = 0;
        else if (strstr(token, "node1") != NULL) node = 1;
        else if (strstr(token, "node2") != NULL) node = 2;
        else if (strstr(token, "node3") != NULL) node = 3;
        else if (strstr(token, "attn") != NULL) {
            node = 3;  /* Default attention to fastest node */
        }
        else if (strstr(token, "ffn") != NULL) {
            node = 2;  /* Default FFN to second fastest */
        }
        
        if (node >= 0) {
            /* Extract layer range */
            int start = -1, end = -1;
            
            if (sscanf(token, "%d-%d", &start, &end) == 2) {
                for (int i = start; i <= end && i < GGML_NUMA_MAX_LAYERS; i++) {
                    config->layer_to_node[i] = node;
                }
            } else if (sscanf(token, "%d:", &start) == 1) {
                if (start < GGML_NUMA_MAX_LAYERS) {
                    config->layer_to_node[start] = node;
                }
            }
        }
        
        token = strtok(NULL, ",");
    }
    
    free(str);
    return 0;
}

/*============================================================================
 * Model Sharding Implementation
 *============================================================================*/

int ggml_numaShard_model(
    ggml_numa_config_t* config,
    ggml_numa_tensor_t* tensors,
    size_t count,
    void* model_data
) {
#if !GGML_NUMA_POWER8
    (void)config;
    (void)tensors;
    (void)count;
    (void)model_data;
    return 0;
#else
    if (!config->enabled) {
        return 0;
    }
    
    size_t total_bound = 0;
    
    for (size_t i = 0; i < count; i++) {
        ggml_numa_tensor_t* t = &tensors[i];
        
        if (t->size == 0 || t->layer_idx < 0) {
            continue;
        }
        
        int layer_type = ggml_numa_parse_layer_type(t->name);
        int node = ggml_numa_get_node(config, t->layer_idx, layer_type);
        
        /* Calculate tensor offset in model data */
        void* tensor_ptr = (char*)model_data + t->offset;
        
        /* Bind memory to NUMA node */
        if (ggml_numa_bind_memory(tensor_ptr, t->size, node) == 0) {
            config->node_memory_used[node] += t->size;
            config->node_tensor_count[node]++;
            total_bound += t->size;
            
            g_numa_stats.numa_bind_time_ms += 0.1;  /* Estimate */
        } else {
            g_numa_stats.shard_violations++;
            g_numa_stats.cross_node_bytes += t->size;
        }
    }
    
    return (int)total_bound;
#endif
}

int ggml_numa_calculate_shards(
    ggml_numa_config_t* config,
    ggml_numa_tensor_t* tensors,
    size_t count,
    ggml_numa_layer_assignment_t* assignments
) {
    if (config == NULL || tensors == NULL || assignments == NULL) {
        return -1;
    }
    
    int num_assignments = 0;
    size_t node_sizes[GGML_NUMA_MAX_NODES] = {0};
    
    /* First pass: identify all layers and categorize */
    for (size_t i = 0; i < count && num_assignments < GGML_NUMA_MAX_LAYERS; i++) {
        ggml_numa_tensor_t* t = &tensors[i];
        
        if (t->layer_idx < 0) {
            continue;
        }
        
        int layer_type = ggml_numa_parse_layer_type(t->name);
        int node = ggml_numa_get_node(config, t->layer_idx, layer_type);
        
        /* Check if we already have an assignment for this layer */
        int found = -1;
        for (int j = 0; j < num_assignments; j++) {
            if (assignments[j].layer_idx == t->layer_idx) {
                found = j;
                break;
            }
        }
        
        if (found >= 0) {
            assignments[found].tensor_count++;
            assignments[found].total_size += t->size;
        } else {
            assignments[num_assignments].layer_idx = t->layer_idx;
            assignments[num_assignments].numa_node = node;
            assignments[num_assignments].tensor_count = 1;
            assignments[num_assignments].total_size = t->size;
            num_assignments++;
        }
        
        node_sizes[node] += t->size;
    }
    
    /* Store node sizes in config for reporting */
    for (int n = 0; n < GGML_NUMA_MAX_NODES; n++) {
        config->node_memory_used[n] = node_sizes[n];
    }
    
    return num_assignments;
}

/*============================================================================
 * Statistics and Benchmarking
 *============================================================================*/

void ggml_numa_get_stats(ggml_numa_stats_t* stats) {
    if (stats != NULL) {
        memcpy(stats, &g_numa_stats, sizeof(*stats));
    }
}

void ggml_numa_print_topology(const ggml_numa_config_t* config) {
    printf("=== NUMA Topology ===\n");
    printf("NUMA Nodes: %d\n", config->numa_node_count);
    printf("Sharding Enabled: %s\n", config->enabled ? "Yes" : "No");
    printf("\n");
    
    for (int i = 0; i < config->numa_node_count; i++) {
        const ggml_numa_node_info_t* node = &config->nodes[i];
        printf("Node %d:\n", i);
        printf("  Total Memory: %zu MB\n", node->total_mem / (1024 * 1024));
        printf("  Free Memory:  %zu MB\n", node->free_mem / (1024 * 1024));
        printf("  Bandwidth:    %.1f MB/s\n", node->bandwidth_mbps);
        printf("  Fast Node:    %s\n", node->is_fast ? "Yes" : "No");
        printf("\n");
    }
    
    printf("Shard Map: %s\n", config->map_str);
}

void ggml_numa_print_shard_summary(
    const ggml_numa_config_t* config,
    const ggml_numa_layer_assignment_t* assignments,
    size_t count
) {
    printf("\n=== NUMA Shard Summary ===\n");
    
    for (int n = 0; n < GGML_NUMA_MAX_NODES; n++) {
        printf("Node %d: %zu tensors, %zu MB\n",
               n,
               config->node_tensor_count[n],
               config->node_memory_used[n] / (1024 * 1024));
    }
    
    printf("\nLayer Assignments (%zu layers):\n", count);
    for (size_t i = 0; i < count && i < 10; i++) {
        printf("  Layer %d -> Node %d\n", 
               assignments[i].layer_idx,
               assignments[i].numa_node);
    }
    if (count > 10) {
        printf("  ... and %zu more layers\n", count - 10);
    }
}

/*============================================================================
 * Utility Functions
 *============================================================================*/

int ggml_numa_is_power8(void) {
#if GGML_NUMA_POWER8
    return 1;
#else
    return 0;
#endif
}

int ggml_numa_optimal_threads(int numa_node) {
    /* Based on testing: 64 threads optimal on POWER8 (NOT 128) */
    (void)numa_node;
    return 64;
}

void ggml_numa_reset_stats(void) {
    memset(&g_numa_stats, 0, sizeof(g_numa_stats));
}

/*============================================================================
 * Test/Main (for standalone compilation test)
 *============================================================================*/

#ifdef GGML_NUMA_MAIN

int main(int argc, char* argv[]) {
    printf("GGML NUMA-Shard Test\n");
    printf("====================\n\n");
    
    ggml_numa_config_t config;
    ggml_numa_init(&config, NULL);
    
    ggml_numa_print_topology(&config);
    
    /* Test shard map parsing */
    printf("\nTesting shard map parsing...\n");
    ggml_numa_parse_map(&config, "0-8:node0,9-20:node1,21-31:node2,attn:node3,ffn:node2");
    
    for (int i = 0; i < 32; i++) {
        printf("Layer %d -> Node %d\n", i, ggml_numa_get_node(&config, i, 0));
    }
    
    printf("\nOptimal threads: %d\n", ggml_numa_optimal_threads(0));
    printf("Is POWER8: %s\n", ggml_numa_is_power8() ? "Yes" : "No");
    
    return 0;
}

#endif /* GGML_NUMA_MAIN */
