import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/markdown";

describe("Methods Markdown", () => {
  it("renders GFM content without executing raw HTML", () => {
    const { container } = render(<Markdown>{"# Note\n\n- [x] checked\n\n<script>alert('x')</script>"}</Markdown>);
    expect(screen.getByRole("heading", { name: "Note" })).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });
});
