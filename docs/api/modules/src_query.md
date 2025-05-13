# Module: src/query

## Classes

### QueryBuilder

#### Methods

##### `setVectorDBConfig()`

Set the active vector database configuration

##### `registerVectorDBConfig()`

Register a custom vector database configuration

##### `getActiveVectorDBConfig()`

Get the current vector database configuration

##### `select()`

Select columns from a table

##### `selectDistinct()`

Select distinct values from columns

##### `insert()`

Insert data into a table

##### `bulkInsert()`

Bulk insert data into a table

##### `update()`

Update data in a table

##### `delete()`

Delete records from a table

##### `from()`

Specify the table to query from

##### `where()`

Add a WHERE condition to the query

##### `where()`

##### `where()`

##### `orWhere()`

Add an OR WHERE condition

##### `whereIn()`

Add a WHERE IN condition

##### `whereNotIn()`

Add a WHERE NOT IN condition

##### `whereBetween()`

Add a WHERE BETWEEN condition

##### `whereNull()`

Add a WHERE NULL condition

##### `whereNotNull()`

Add a WHERE NOT NULL condition

##### `join()`

Add a JOIN clause to the query

##### `innerJoin()`

Add an INNER JOIN clause

##### `leftJoin()`

Add a LEFT JOIN clause

##### `rightJoin()`

Add a RIGHT JOIN clause

##### `fullJoin()`

Add a FULL JOIN clause

##### `groupBy()`

Add a GROUP BY clause

##### `having()`

Add a HAVING clause

##### `orderBy()`

Add ordering to the query

##### `limit()`

Add a LIMIT clause

##### `offset()`

Add an OFFSET clause

##### `paginate()`

Add pagination

##### `with()`

Add a WITH clause (Common Table Expression)

##### `union()`

Add a UNION clause

##### `returning()`

Add a RETURNING clause for INSERT, UPDATE, DELETE

##### `vectorOperation()`

Add vector operations for AI/ML queries

##### `knnSearch()`

Add K-Nearest Neighbors search for vector similarity

##### `similaritySearch()`

Calculate vector similarity between query vector and database vectors

##### `distanceSearch()`

Calculate vector distance between query vector and database vectors

##### `vectorMatch()`

Match records where vector similarity exceeds threshold

##### `customVectorOperation()`

Custom vector operation with raw syntax

##### `rawSql()`

Add a raw SQL clause to the query
This allows for database-specific functionality not covered by other methods

##### `window()`

Add a window function to the query

##### `count()`

Add a common aggregate query for counting records

##### `sum()`

Add a sum aggregate function

##### `avg()`

Add an average aggregate function

##### `min()`

Add a min aggregate function

##### `max()`

Add a max aggregate function

##### `jsonPath()`

Add a JSON path extraction operation (PostgreSQL specific)

##### `textSearch()`

Add full-text search capability

##### `withRecursive()`

Add recursive CTE for hierarchical data

##### `timeRange()`

Add time-based range filtering for temporal data

##### `case()`

Add a conditional expression (CASE WHEN) to the query

##### `cosineSimilarity()`

Add support for vector comparison with cosine similarity for AI/ML

##### `geoRadius()`

Add a geospatial search for location-based queries

##### `hybridRanking()`

Add parameters to modify ordering for vector similarity search

##### `transaction()`

Create a database transaction for multiple operations

##### `useVectorDB()`

Update the vector database configuration for the current query
This allows switching vector DB config for a specific query without changing the global setting

##### `andWhere()`

Add an AND WHERE condition

##### `buildSelect()`

##### `buildInsert()`

##### `isDate()`

Helper method to check if a value is a Date object

##### `buildWhereClause()`

##### `buildUpdate()`

##### `buildDelete()`

##### `convertParamsForAdapter()`

Converts Date objects to ISO strings for database compatibility
This ensures that Date objects are properly handled by the database adapter

##### `calculateQueryHash()`

Calculate a hash of the current query for caching purposes

##### `execute()`

Execute the query using the provided database adapter

##### `toSQL()`

Get the raw SQL and parameters without executing the query

##### `clone()`

Clone the current query builder for reuse

##### `reset()`

Reset the query builder state

##### `buildBaseSelect()`


### QueryBuilder

#### Methods

##### `setVectorDBConfig()`

Set the active vector database configuration

##### `registerVectorDBConfig()`

Register a custom vector database configuration

##### `getActiveVectorDBConfig()`

Get the current vector database configuration

##### `select()`

Select columns from a table

##### `selectDistinct()`

Select distinct values from columns

##### `insert()`

Insert data into a table

##### `bulkInsert()`

Bulk insert data into a table

##### `update()`

Update data in a table

##### `delete()`

Delete records from a table

##### `from()`

Specify the table to query from

##### `where()`

Add a WHERE condition to the query

##### `where()`

##### `where()`

##### `orWhere()`

Add an OR WHERE condition

##### `whereIn()`

Add a WHERE IN condition

##### `whereNotIn()`

Add a WHERE NOT IN condition

##### `whereBetween()`

Add a WHERE BETWEEN condition

##### `whereNull()`

Add a WHERE NULL condition

##### `whereNotNull()`

Add a WHERE NOT NULL condition

##### `join()`

Add a JOIN clause to the query

##### `innerJoin()`

Add an INNER JOIN clause

##### `leftJoin()`

Add a LEFT JOIN clause

##### `rightJoin()`

Add a RIGHT JOIN clause

##### `fullJoin()`

Add a FULL JOIN clause

##### `groupBy()`

Add a GROUP BY clause

##### `having()`

Add a HAVING clause

##### `orderBy()`

Add ordering to the query

##### `limit()`

Add a LIMIT clause

##### `offset()`

Add an OFFSET clause

##### `paginate()`

Add pagination

##### `with()`

Add a WITH clause (Common Table Expression)

##### `union()`

Add a UNION clause

##### `returning()`

Add a RETURNING clause for INSERT, UPDATE, DELETE

##### `vectorOperation()`

Add vector operations for AI/ML queries

##### `knnSearch()`

Add K-Nearest Neighbors search for vector similarity

##### `similaritySearch()`

Calculate vector similarity between query vector and database vectors

##### `distanceSearch()`

Calculate vector distance between query vector and database vectors

##### `vectorMatch()`

Match records where vector similarity exceeds threshold

##### `customVectorOperation()`

Custom vector operation with raw syntax

##### `rawSql()`

Add a raw SQL clause to the query
This allows for database-specific functionality not covered by other methods

##### `window()`

Add a window function to the query

##### `count()`

Add a common aggregate query for counting records

##### `sum()`

Add a sum aggregate function

##### `avg()`

Add an average aggregate function

##### `min()`

Add a min aggregate function

##### `max()`

Add a max aggregate function

##### `jsonPath()`

Add a JSON path extraction operation (PostgreSQL specific)

##### `textSearch()`

Add full-text search capability

##### `withRecursive()`

Add recursive CTE for hierarchical data

##### `timeRange()`

Add time-based range filtering for temporal data

##### `case()`

Add a conditional expression (CASE WHEN) to the query

##### `cosineSimilarity()`

Add support for vector comparison with cosine similarity for AI/ML

##### `geoRadius()`

Add a geospatial search for location-based queries

##### `hybridRanking()`

Add parameters to modify ordering for vector similarity search

##### `transaction()`

Create a database transaction for multiple operations

##### `useVectorDB()`

Update the vector database configuration for the current query
This allows switching vector DB config for a specific query without changing the global setting

##### `andWhere()`

Add an AND WHERE condition

##### `buildSelect()`

##### `buildInsert()`

##### `isDate()`

Helper method to check if a value is a Date object

##### `buildWhereClause()`

##### `buildUpdate()`

##### `buildDelete()`

##### `convertParamsForAdapter()`

Converts Date objects to ISO strings for database compatibility
This ensures that Date objects are properly handled by the database adapter

##### `calculateQueryHash()`

Calculate a hash of the current query for caching purposes

##### `execute()`

Execute the query using the provided database adapter

##### `toSQL()`

Get the raw SQL and parameters without executing the query

##### `clone()`

Clone the current query builder for reuse

##### `reset()`

Reset the query builder state

##### `buildBaseSelect()`


### QueryBuilder

#### Methods

##### `setVectorDBConfig()`

Set the active vector database configuration

##### `registerVectorDBConfig()`

Register a custom vector database configuration

##### `getActiveVectorDBConfig()`

Get the current vector database configuration

##### `select()`

Select columns from a table

##### `selectDistinct()`

Select distinct values from columns

##### `insert()`

Insert data into a table

##### `bulkInsert()`

Bulk insert data into a table

##### `update()`

Update data in a table

##### `delete()`

Delete records from a table

##### `from()`

Specify the table to query from

##### `where()`

Add a WHERE condition to the query

##### `where()`

##### `where()`

##### `orWhere()`

Add an OR WHERE condition

##### `whereIn()`

Add a WHERE IN condition

##### `whereNotIn()`

Add a WHERE NOT IN condition

##### `whereBetween()`

Add a WHERE BETWEEN condition

##### `whereNull()`

Add a WHERE NULL condition

##### `whereNotNull()`

Add a WHERE NOT NULL condition

##### `join()`

Add a JOIN clause to the query

##### `innerJoin()`

Add an INNER JOIN clause

##### `leftJoin()`

Add a LEFT JOIN clause

##### `rightJoin()`

Add a RIGHT JOIN clause

##### `fullJoin()`

Add a FULL JOIN clause

##### `groupBy()`

Add a GROUP BY clause

##### `having()`

Add a HAVING clause

##### `orderBy()`

Add ordering to the query

##### `limit()`

Add a LIMIT clause

##### `offset()`

Add an OFFSET clause

##### `paginate()`

Add pagination

##### `with()`

Add a WITH clause (Common Table Expression)

##### `union()`

Add a UNION clause

##### `returning()`

Add a RETURNING clause for INSERT, UPDATE, DELETE

##### `vectorOperation()`

Add vector operations for AI/ML queries

##### `knnSearch()`

Add K-Nearest Neighbors search for vector similarity

##### `similaritySearch()`

Calculate vector similarity between query vector and database vectors

##### `distanceSearch()`

Calculate vector distance between query vector and database vectors

##### `vectorMatch()`

Match records where vector similarity exceeds threshold

##### `customVectorOperation()`

Custom vector operation with raw syntax

##### `rawSql()`

Add a raw SQL clause to the query
This allows for database-specific functionality not covered by other methods

##### `window()`

Add a window function to the query

##### `count()`

Add a common aggregate query for counting records

##### `sum()`

Add a sum aggregate function

##### `avg()`

Add an average aggregate function

##### `min()`

Add a min aggregate function

##### `max()`

Add a max aggregate function

##### `jsonPath()`

Add a JSON path extraction operation (PostgreSQL specific)

##### `textSearch()`

Add full-text search capability

##### `withRecursive()`

Add recursive CTE for hierarchical data

##### `timeRange()`

Add time-based range filtering for temporal data

##### `case()`

Add a conditional expression (CASE WHEN) to the query

##### `cosineSimilarity()`

Add support for vector comparison with cosine similarity for AI/ML

##### `geoRadius()`

Add a geospatial search for location-based queries

##### `hybridRanking()`

Add parameters to modify ordering for vector similarity search

##### `transaction()`

Create a database transaction for multiple operations

##### `useVectorDB()`

Update the vector database configuration for the current query
This allows switching vector DB config for a specific query without changing the global setting

##### `andWhere()`

Add an AND WHERE condition

##### `buildSelect()`

##### `buildInsert()`

##### `isDate()`

Helper method to check if a value is a Date object

##### `buildWhereClause()`

##### `buildUpdate()`

##### `buildDelete()`

##### `convertParamsForAdapter()`

Converts Date objects to ISO strings for database compatibility
This ensures that Date objects are properly handled by the database adapter

##### `calculateQueryHash()`

Calculate a hash of the current query for caching purposes

##### `execute()`

Execute the query using the provided database adapter

##### `toSQL()`

Get the raw SQL and parameters without executing the query

##### `clone()`

Clone the current query builder for reuse

##### `reset()`

Reset the query builder state

##### `buildBaseSelect()`


### QueryBuilder

#### Methods

##### `setVectorDBConfig()`

Set the active vector database configuration

##### `registerVectorDBConfig()`

Register a custom vector database configuration

##### `getActiveVectorDBConfig()`

Get the current vector database configuration

##### `select()`

Select columns from a table

##### `selectDistinct()`

Select distinct values from columns

##### `insert()`

Insert data into a table

##### `bulkInsert()`

Bulk insert data into a table

##### `update()`

Update data in a table

##### `delete()`

Delete records from a table

##### `from()`

Specify the table to query from

##### `where()`

Add a WHERE condition to the query

##### `where()`

##### `where()`

##### `orWhere()`

Add an OR WHERE condition

##### `whereIn()`

Add a WHERE IN condition

##### `whereNotIn()`

Add a WHERE NOT IN condition

##### `whereBetween()`

Add a WHERE BETWEEN condition

##### `whereNull()`

Add a WHERE NULL condition

##### `whereNotNull()`

Add a WHERE NOT NULL condition

##### `join()`

Add a JOIN clause to the query

##### `innerJoin()`

Add an INNER JOIN clause

##### `leftJoin()`

Add a LEFT JOIN clause

##### `rightJoin()`

Add a RIGHT JOIN clause

##### `fullJoin()`

Add a FULL JOIN clause

##### `groupBy()`

Add a GROUP BY clause

##### `having()`

Add a HAVING clause

##### `orderBy()`

Add ordering to the query

##### `limit()`

Add a LIMIT clause

##### `offset()`

Add an OFFSET clause

##### `paginate()`

Add pagination

##### `with()`

Add a WITH clause (Common Table Expression)

##### `union()`

Add a UNION clause

##### `returning()`

Add a RETURNING clause for INSERT, UPDATE, DELETE

##### `vectorOperation()`

Add vector operations for AI/ML queries

##### `knnSearch()`

Add K-Nearest Neighbors search for vector similarity

##### `similaritySearch()`

Calculate vector similarity between query vector and database vectors

##### `distanceSearch()`

Calculate vector distance between query vector and database vectors

##### `vectorMatch()`

Match records where vector similarity exceeds threshold

##### `customVectorOperation()`

Custom vector operation with raw syntax

##### `rawSql()`

Add a raw SQL clause to the query
This allows for database-specific functionality not covered by other methods

##### `window()`

Add a window function to the query

##### `count()`

Add a common aggregate query for counting records

##### `sum()`

Add a sum aggregate function

##### `avg()`

Add an average aggregate function

##### `min()`

Add a min aggregate function

##### `max()`

Add a max aggregate function

##### `jsonPath()`

Add a JSON path extraction operation (PostgreSQL specific)

##### `textSearch()`

Add full-text search capability

##### `withRecursive()`

Add recursive CTE for hierarchical data

##### `timeRange()`

Add time-based range filtering for temporal data

##### `case()`

Add a conditional expression (CASE WHEN) to the query

##### `cosineSimilarity()`

Add support for vector comparison with cosine similarity for AI/ML

##### `geoRadius()`

Add a geospatial search for location-based queries

##### `hybridRanking()`

Add parameters to modify ordering for vector similarity search

##### `transaction()`

Create a database transaction for multiple operations

##### `useVectorDB()`

Update the vector database configuration for the current query
This allows switching vector DB config for a specific query without changing the global setting

##### `andWhere()`

Add an AND WHERE condition

##### `buildSelect()`

##### `buildInsert()`

##### `isDate()`

Helper method to check if a value is a Date object

##### `buildWhereClause()`

##### `buildUpdate()`

##### `buildDelete()`

##### `convertParamsForAdapter()`

Converts Date objects to ISO strings for database compatibility
This ensures that Date objects are properly handled by the database adapter

##### `calculateQueryHash()`

Calculate a hash of the current query for caching purposes

##### `execute()`

Execute the query using the provided database adapter

##### `toSQL()`

Get the raw SQL and parameters without executing the query

##### `clone()`

Clone the current query builder for reuse

##### `reset()`

Reset the query builder state

##### `buildBaseSelect()`


