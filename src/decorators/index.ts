import "reflect-metadata";

// Entity and Model definitions
export { Entity } from "./Entity.ts";
export type { EntityOptions } from "./Entity.ts";
export { Entity as Model } from "./Entity.ts";

// Column definitions
export { Column } from "./Column.ts";
export type { ColumnOptions } from "./Column.ts";
export { PrimaryKey } from "./PrimaryKey.ts";
export { Field } from "./Field.ts";

// Relationship decorators
export { OneToOne } from "./OneToOne.ts";
export { OneToMany } from "./OneToMany.ts";
export { ManyToOne } from "./ManyToOne.ts";
export { ManyToMany } from "./ManyToMany.ts";

// Validation decorators
export { Validate } from "./Validate.ts";
export { ValidateMultiple } from "./ValidateMultiple.ts";

// Enterprise feature decorators
export { SoftDelete } from "./SoftDelete.ts";
export { TenantScoped } from "./TenantScoped.ts";
export { Audited } from "./Audited.ts";
export { Encrypted } from "./Encrypted.ts";
export { DataRetention } from "./DataRetention.ts";
export { RowLevelSecurity } from "./RowLevelSecurity.ts";
export { Versioned } from "./Versioned.ts";
