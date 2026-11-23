import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { request } from "../test/fixtures";
import { loadState, saveState } from "../lib/store";
import { timestampLabel } from "../lib/scheduler";

function seedConflict() {
  const flexible = request({
    id: "flex",
    project: "Flexible sensor project",
    status: "approved",
    createdAt: "2026-01-01T08:00:00Z",
  });
  const fixed = request({
    id: "fixed",
    project: "Exact-slot sensor project",
    flexible: false,
    createdAt: "2026-01-01T09:00:00Z",
  });
  saveState({ version: 1, requests: [flexible, fixed] });
  return { flexible, fixed };
}
describe("faculty relocation workflow", () => {
  it("requires slot selection and explicit confirmation, then shows linked history", async () => {
    const { flexible } = seedConflict();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Faculty demo" }));
    const card = screen
      .getByRole("heading", { name: "Exact-slot sensor project" })
      .closest("article")!;
    expect(
      within(card).getByRole("button", { name: "Approve preferred slot" }),
    ).toBeDisabled();
    expect(
      within(card).getByText(/Booked by.*Requested first/),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "Review move & approval" }),
    ).toBeDisabled();
    const select = within(card).getByRole("combobox", {
      name: "Replacement for the flexible booking",
    });
    fireEvent.change(select, {
      target: { value: select.querySelectorAll("option")[1].value },
    });
    await user.click(
      within(card).getByRole("button", { name: "Review move & approval" }),
    );
    expect(
      within(card).getByRole("heading", { name: "Confirm both changes" }),
    ).toBeInTheDocument();
    expect(loadState().requests.find((r) => r.id === "flex")?.start).toBe(
      flexible.start,
    );
    expect(loadState().requests.find((r) => r.id === "fixed")?.status).toBe(
      "pending",
    );
    await user.click(within(card).getByRole("button", { name: "Cancel move" }));
    expect(
      within(card).queryByRole("button", { name: "Confirm move & approve" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(card).getByRole("button", { name: "Review move & approval" }),
    );
    await user.click(
      within(card).getByRole("button", { name: "Confirm move & approve" }),
    );
    expect(
      await screen.findByText(
        /Flexible booking moved and exact-slot request approved together/,
      ),
    ).toBeInTheDocument();
    expect(loadState().requests.every((r) => r.status === "approved")).toBe(
      true,
    );
    const movedCard = screen
      .getByRole("heading", { name: "Flexible sensor project" })
      .closest("article")!;
    await user.click(within(movedCard).getByText(/Full change history/));
    expect(
      within(movedCard).getByText("Rescheduled by faculty"),
    ).toBeInTheDocument();
    expect(
      within(movedCard).getByText(/Original:.*Replacement:/),
    ).toBeInTheDocument();
    expect(
      within(movedCard).getAllByText(timestampLabel(flexible.createdAt)).length,
    ).toBeGreaterThan(0);
  });
  it("shows legacy timestamp limitations rather than inventing approval times", async () => {
    seedConflict();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Faculty demo" }));
    const card = screen
      .getByRole("heading", { name: "Flexible sensor project" })
      .closest("article")!;
    expect(
      within(card).getByText(/Requested first · earliest submission/),
    ).toBeInTheDocument();
    await user.click(within(card).getByText(/Full change history/));
    expect(
      within(card).getByText(/no recorded approval timestamp/),
    ).toBeInTheDocument();
  });
});
