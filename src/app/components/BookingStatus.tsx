type Props = {
  status: string;
};

export default function BookingStatus({ status }: Props) {
  let background = "#facc15";
  let color = "#000";

  if (status === "Accepted") {
    background = "#22c55e";
    color = "#fff";
  }

  if (status === "Rejected") {
    background = "#ef4444";
    color = "#fff";
  }

  if (status === "Completed") {
    background = "#6b7280";
    color = "#fff";
  }

  return (
    <span
      style={{
        background,
        color,
        padding: "6px 12px",
        borderRadius: "20px",
        fontWeight: "bold",
        fontSize: "14px",
      }}
    >
      {status}
    </span>
  );
}