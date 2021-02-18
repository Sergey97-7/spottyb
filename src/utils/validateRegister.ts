import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
  const { email, username, password } = options;
  if (!email.includes("@")) {
    return [{ field: "email", message: "wrong email format" }];
  }
  if (username.length <= 3) {
    return [{ field: "username", message: "username length less then 4" }];
  }
  if (username.includes("@")) {
    return [{ field: "username", message: "cannot include an @" }];
  }
  if (password.length <= 3) {
    return [{ field: "password", message: "password length less then 4" }];
  }
  return null;
};
