import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { User } from "./../entities/User";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "./../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";

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

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // if current user
    if (req.session.userId === user.id) {
      return user.email;
    } else {
      // if alien email
      return "";
    }
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 3) {
      return {
        errors: [
          { field: "newPassword", message: "newPassword length less then 4" },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "token expired" }],
      };
    }

    const user = await User.findOne(+userId);
    if (!user) {
      return {
        errors: [{ field: "token", message: "user no longer exists" }],
      };
    }
    await User.update(
      { id: +userId },
      { password: await argon2.hash(newPassword) }
    );
    req.session.userId = user.id;

    await redis.del(key);

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return true;
    }
    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60
    );
    await sendEmail(
      email,
      `<a href="http://localhost:3001/change-password/${token}">reset password</a>`
    );
    return true;
  }
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    const { userId } = req.session;
    if (!userId) {
      return null;
    }
    return User.findOne(userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const { email, username, password } = options;
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    let user;
    const hashedPassword = await argon2.hash(password);
    try {
      const result = await User.create({
        username,
        email,
        password: hashedPassword,
      }).save();
      user = result;
    } catch (e) {
      console.log("err", e);
      if (e.code === "23505") {
        return {
          errors: [
            {
              field: "usernameOrEmail",
              message: "this username or email is already exists",
            },
          ],
        };
      } else {
        return {
          errors: [
            {
              field: "usernameOrEmail",
              message: "something went wrong",
            },
          ],
        };
      }
    }
    req.session!.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "that username or email doesn't exists",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{ field: "password", message: "incorrect password" }],
      };
    }
    req.session!.userId = user.id;
    return { user };
  }
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          resolve(false);
        } else {
          res.clearCookie(COOKIE_NAME);
          resolve(true);
        }
      })
    );
  }
}
