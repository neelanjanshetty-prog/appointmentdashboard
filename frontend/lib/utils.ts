export const cn = (...inputs: Array<string | false | null | undefined>) => inputs.filter(Boolean).join(" ");

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
