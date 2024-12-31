import { Column } from "./Column.ts";

export function PrimaryKey(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    Column({
      type: "integer",
      primaryKey: true,
      nullable: false
    })(target, propertyKey);
  };
}
