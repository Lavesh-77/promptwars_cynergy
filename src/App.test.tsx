import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import App from "./App";
import { addDays, dateKey } from "./lib/scheduler";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
describe("public demo workflow", () => {
  it("filters equipment and clears empty results", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByRole("textbox", { name: "Search equipment" }),
      "nonexistent",
    );
    expect(screen.getByText("No matching resources")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByRole("heading", { name: "Arduino Uno R4 WiFi" }),
    ).toBeInTheDocument();
  });
  it("creates a project request, approves it, and keeps it on reload", async () => {
    const user = userEvent.setup();
    const rendered = render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: "Request access to Arduino Uno R4 WiFi",
      }),
    );
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Your name"), "Alex Demo");
    await user.type(
      within(dialog).getByLabelText("Project title"),
      "Campus garden sensor",
    );
    await user.type(
      within(dialog).getByLabelText("Project & equipment requirements"),
      "Build an IoT sensor to measure soil moisture in the campus garden.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Submit access request" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Request submitted!" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View my requests" }));
    await user.click(screen.getByRole("button", { name: "Faculty demo" }));
    const heading = screen.getByRole("heading", {
      name: "Campus garden sensor",
    });
    const card = heading.closest("article")!;
    await user.click(
      within(card).getByRole("button", { name: "Approve preferred slot" }),
    );
    await waitFor(() =>
      expect(
        within(card).getByText("approved", { exact: true }),
      ).toBeInTheDocument(),
    );
    rendered.unmount();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /My requests/ }));
    expect(
      within(
        screen
          .getByRole("heading", { name: "Campus garden sensor" })
          .closest("article")!,
      ).getByText("approved", { exact: true }),
    ).toBeInTheDocument();
  });
  it("explains a booking conflict and lets a student choose a feasible slot", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: /Try a scheduling conflict/ }),
    );
    expect(
      await screen.findByText("A scheduling conflict was found"),
    ).toBeInTheDocument();
    const alternatives = screen
      .getByRole("dialog")
      .querySelectorAll(".slot-option");
    expect(alternatives.length).toBeGreaterThan(0);
    await user.click(alternatives[0]);
    expect(
      screen.getByText("Your preferred slot looks available"),
    ).toBeInTheDocument();
  });
  it("validates a session that ends outside campus hours", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: "Request access to Arduino Uno R4 WiFi",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Your name"), {
      target: { value: "Alex Demo" },
    });
    fireEvent.change(within(dialog).getByLabelText("Project title"), {
      target: { value: "Sensor project" },
    });
    fireEvent.change(
      within(dialog).getByLabelText("Project & equipment requirements"),
      { target: { value: "Test a working sensor prototype." } },
    );
    fireEvent.change(within(dialog).getByLabelText("Session date"), {
      target: { value: addDays(dateKey(), 1) },
    });
    await user.selectOptions(
      within(dialog).getByLabelText("Preferred start"),
      "990",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Submit access request" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("finish by 17:00");
  });
});
