-- Enable realtime for tracking and tracking_events tables
ALTER PUBLICATION supabase_realtime ADD TABLE tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE tracking_events;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_proofs;

-- Set replica identity for full row data in realtime
ALTER TABLE tracking REPLICA IDENTITY FULL;
ALTER TABLE tracking_events REPLICA IDENTITY FULL;
ALTER TABLE delivery_proofs REPLICA IDENTITY FULL;

-- Allow merchants to insert tracking events (for shipment updates)
CREATE POLICY "Merchants can insert tracking events for their orders"
ON public.tracking_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tracking t
    JOIN orders o ON o.id = t.order_id
    WHERE t.id = tracking_events.tracking_id
    AND o.merchant_id = auth.uid()
  )
);

-- Allow merchants to view their delivery proofs
CREATE POLICY "Merchants can view delivery proofs for their orders"
ON public.delivery_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_proofs.order_id
    AND o.merchant_id = auth.uid()
  )
);

-- Allow merchants to insert delivery proofs for their orders
CREATE POLICY "Merchants can insert delivery proofs for their orders"
ON public.delivery_proofs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_proofs.order_id
    AND o.merchant_id = auth.uid()
  )
);