export interface RelationMetadata {
  propertyKey: string;
  target: string;
  relationType: string;
  type: string; // Add this property
  foreignKey: string;
}

export interface ColumnMetadata {
  propertyKey: string;
  type: string;
}

export interface ModelMetadata {
  name: string;
  entityName: string;
  columns: ColumnMetadata[];
  relations: RelationMetadata[];
}
