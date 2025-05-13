# Module: src/vector/search

## Classes

### HybridSearchOptimizer

Class that optimizes hybrid search queries combining vector and text search

#### Methods

##### `optimizeQuery()`

Optimize a query for hybrid vector and text search


##### `vectorFirstStrategy()`

Implementation of the vector-first search strategy
First searches by vector similarity, then refines with text search


##### `textFirstStrategy()`

Implementation of the text-first search strategy
First searches by text, then refines with vector similarity


##### `parallelStrategy()`

Implementation of the parallel search strategy
Searches by both vector and text in parallel, then combines results
This is generally more expensive but can provide better results


##### `rerank()`

Rerank results using a linear combination of vector and text scores



### HybridSearchOptimizer

Class that optimizes hybrid search queries combining vector and text search

#### Methods

##### `optimizeQuery()`

Optimize a query for hybrid vector and text search


##### `vectorFirstStrategy()`

Implementation of the vector-first search strategy
First searches by vector similarity, then refines with text search


##### `textFirstStrategy()`

Implementation of the text-first search strategy
First searches by text, then refines with vector similarity


##### `parallelStrategy()`

Implementation of the parallel search strategy
Searches by both vector and text in parallel, then combines results
This is generally more expensive but can provide better results


##### `rerank()`

Rerank results using a linear combination of vector and text scores



### default

Class that optimizes hybrid search queries combining vector and text search

#### Methods

##### `optimizeQuery()`

Optimize a query for hybrid vector and text search


##### `vectorFirstStrategy()`

Implementation of the vector-first search strategy
First searches by vector similarity, then refines with text search


##### `textFirstStrategy()`

Implementation of the text-first search strategy
First searches by text, then refines with vector similarity


##### `parallelStrategy()`

Implementation of the parallel search strategy
Searches by both vector and text in parallel, then combines results
This is generally more expensive but can provide better results


##### `rerank()`

Rerank results using a linear combination of vector and text scores



