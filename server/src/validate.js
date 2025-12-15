import { z } from "zod";

export const zId = z.coerce.number().int().positive();

export function parseBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: "Invalid request body",
        details: result.error.flatten(),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

