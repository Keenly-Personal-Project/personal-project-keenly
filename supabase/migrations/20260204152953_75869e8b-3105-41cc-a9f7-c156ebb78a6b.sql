-- Create check_ins table for storing user check-in timestamps
CREATE TABLE public.check_ins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (users can only see/modify their own check-ins)
CREATE POLICY "Users can view their own check-ins" 
ON public.check_ins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check-ins" 
ON public.check_ins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own check-ins" 
ON public.check_ins 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster user lookups
CREATE INDEX idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX idx_check_ins_checked_in_at ON public.check_ins(checked_in_at DESC);