
CREATE TABLE public.keen_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keen_join_requests ENABLE ROW LEVEL SECURITY;

-- Requestors can create their own requests
CREATE POLICY "Users can request to join a Keen"
ON public.keen_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Requestors can view their own requests; owners/admins can view all for their keen
CREATE POLICY "Users can view relevant join requests"
ON public.keen_join_requests
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text, 'admin'::text])
);

-- Owners/admins can update request status (accept/reject)
CREATE POLICY "Owners and admins can update join requests"
ON public.keen_join_requests
FOR UPDATE
TO authenticated
USING (has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text, 'admin'::text]));

-- Owners/admins can delete requests; users can cancel their own
CREATE POLICY "Users can delete join requests"
ON public.keen_join_requests
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR has_keen_role(class_slug, auth.uid(), ARRAY['owner'::text, 'admin'::text])
);

CREATE UNIQUE INDEX idx_keen_join_requests_unique ON public.keen_join_requests (class_slug, user_id) WHERE status = 'pending';
