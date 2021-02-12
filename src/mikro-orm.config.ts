import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from "path";
import { User } from "./entities/User";
export default {
  entities: [Post, User],
  dbName: "spoty",
  type: "postgresql",
  debug: __prod__,
  migrations: {
    path: path.join(__dirname, "./migrations"),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  user: "postgres",
  password: "",
} as Parameters<typeof MikroORM.init>[0];

//redis 6379