import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import argon2 from "argon2";
import { User } from "./../entities/User";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    if (username.length <= 3) {
      return {
        errors: [{ field: "username", message: "username length less then 4" }],
      };
    }
    if (password.length <= 3) {
      return {
        errors: [{ field: "password", message: "password length less then 4" }],
      };
    }
    const checkedUser: User | null = await em.findOne(User, { username });
    if (checkedUser) {
      return {
        errors: [
          { field: "username", message: "this username is already exists" },
        ],
      };
    }
    const hashedPassword = await argon2.hash(password);
    const user = em.create(User, {
      username,
      password: hashedPassword,
    });
    await em.persistAndFlush(user);
   
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = options;
    const user = await em.findOne(User, { username });
    if (!user) {
      return {
        errors: [
          { field: "username", message: "that username doesn't exists" },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{ field: "password", message: "incorrect password" }],
      };
    }
    // const hashedPassword = await argon2.hash(password);
    // const user = em.create(User, {
    //   username,
    //   password: hashedPassword,
    // });
    // await em.persistAndFlush(user);
    return { user };
  }
}