import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from "fumadocs-mdx/config"

export default defineConfig()

export const docs = defineDocs({
  dir: "content/docs",
  docs: { schema: frontmatterSchema },
  meta: { schema: metaSchema },
})
