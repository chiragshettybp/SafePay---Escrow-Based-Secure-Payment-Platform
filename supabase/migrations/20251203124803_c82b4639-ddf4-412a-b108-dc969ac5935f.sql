-- Allow customers to delete their own draft orders
CREATE POLICY "Customers can delete their own draft orders"
ON public.orders FOR DELETE
USING (auth.uid() = customer_id AND status = 'draft');