import {
  RunInput,
  FunctionRunResult,
  CartOperation,
  ProductVariant,
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  const operations: CartOperation[] = [];

  // ✅ Hardcoded Pickup Settings
  const fixedCharge = parseFloat(input.shop.fixedCharge?.value || "15");
  const percentageCharge = parseFloat(input.shop.percentageCharge?.value || "4");
  const threshold = parseFloat(input.shop.threshold?.value || "500");


  // ✅ 1. Filter cart lines with "Pickup" bundleId
  const pickupLines = input.cart.lines.filter(
    (line) => line.bundleId?.value === "Pickup"
  );

  // ✅ 2. Apply pickup charges
  pickupLines.forEach((line) => {
    const totalAmount = parseFloat(line.cost.totalAmount.amount);
    const quantity = line.quantity;
    const unitAmount = totalAmount / quantity;

    let newUnitPrice: number;

    if (totalAmount >= threshold) {
      // Flat fee
      newUnitPrice = unitAmount + fixedCharge / quantity;
    } else {
      // Percentage-based fee
      newUnitPrice = unitAmount * (1 + percentageCharge / 100);
    }

    const title =
      (line.merchandise as ProductVariant).product.title + " - Pickup Added";

    operations.push({
      update: {
        cartLineId: line.id,
        title,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: newUnitPrice.toFixed(2),
            },
          },
        },
        
      },
    });
  });

  return { operations };
}
