import { solvro } from "@solvro/config/eslint";

export default solvro(
  {
    ignores: [".adonisjs/**"],
  },
  {
    rules: {
      "import/no-default-export": "off",
    },
  },
);
