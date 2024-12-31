import { Column } from "./Column.ts";

export function PrimaryKey() {
  return function (target: any, propertyKey: string | symbol) {
    return Column({
      type: "integer",
      primaryKey: true,
      nullable: false
    })(target, propertyKey);
  };
}
