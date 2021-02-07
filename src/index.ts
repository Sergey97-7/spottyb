import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import microConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();
  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
  });
  apolloServer.applyMiddleware({ app });

  app.listen(3000, () => {
    console.log("listening a 3000");
  });

  // const post = orm.em.create(Post, { title: "title" });
  // await orm.em.persistAndFlush(post);
  // await orm.em.nativeInsert(Post, { title: "title3" });
  // const post1 = new Post("title2");
  // const posts = await orm.em.find(Post, {});
  // console.log("posts", posts);
};

main().catch((err) => {
  console.error(err);
});
