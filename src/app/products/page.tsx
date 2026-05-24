import { ProductList } from "@/components/products/product-list";

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-2 text-muted-foreground">
          Reserve stock at a warehouse for 10 minutes while you complete checkout.
        </p>
      </div>
      <ProductList />
    </div>
  );
}
