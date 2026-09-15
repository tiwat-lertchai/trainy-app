import { describe, expect, it } from "bun:test";
import { createAuthEmailSender } from "./auth-email";

describe("auth email sender", () => {
  it("uses the configured sender without changing security-sensitive message content", async () => {
    const sent: unknown[] = [];
    const send = createAuthEmailSender(
      {
        async sendMail(message) {
          sent.push(message);
        },
      },
      "Trainy <security@trainy.test>",
    );

    await send({
      to: "student@example.test",
      subject: "Reset your Trainy password",
      text: "https://trainy.test/reset?token=opaque",
    });

    expect(sent).toEqual([
      {
        from: "Trainy <security@trainy.test>",
        to: "student@example.test",
        subject: "Reset your Trainy password",
        text: "https://trainy.test/reset?token=opaque",
      },
    ]);
  });
});
