import { z } from "zod";

export const addDomainSchema = z.object({
  host: z
    .string("Host is required")
    .trim()
    .toLowerCase() 
    .min(3, "Host must be at least 3 characters long")
    .max(253, "Host cannot exceed 253 characters")
    .regex(
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid domain or subdomain without http://, https://, or slashes (e.g., go.xyz.abc)"
    )
    .transform(host => host.replace(/\.$/, ""))
});

export const domainIdSchema = z.object({
  id : z.cuid2()
})


export type domainIdData = z.infer<typeof domainIdSchema>

export type addDomainData = z.infer<typeof addDomainSchema>;