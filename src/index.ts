import "reflect-metadata";
require("dotenv").config();
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "./types";
import cors from "cors";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { Updoot } from "./entities/Updoot";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";

const Redis = require("ioredis");

const main = async () => {
  const conn = createConnection({
    type: "postgres",
    database: "spotty",
    username: "postgres",
    password: process.env.POSTGRESQL_PASS,
    logging: true,
    synchronize: true,
    entities: [Post, User, Updoot],
  });
  conn.catch((e) => console.log("e", e));
  const app = express();
  const RedisStore = connectRedis(session);
  //redis 6379
  const redis = new Redis();
  app.use(
    cors({
      origin: "http://localhost:3001",
      credentials: true,
    })
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
        httpOnly: true,
        sameSite: "lax", //csrf
        secure: __prod__, //https
      },
      secret: "random string",
      resave: true,
      saveUninitialized: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }), // разделить слои
  });
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(3000, () => {
    console.log("listening a 3000");
  });
};

main().catch((err) => {
  console.error(err);
});
