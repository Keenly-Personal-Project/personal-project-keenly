import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Loader2 } from 'lucide-react';

const CheckInButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckIn = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          checked_in_at: new Date().toISOString(),
        });

      if (error) throw error;

      setIsCheckedIn(true);
      toast({
        title: "Checked in!",
        description: `You checked in at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckIn} 
      disabled={isLoading || isCheckedIn}
      size="lg"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isCheckedIn ? (
        <Check className="h-5 w-5" />
      ) : null}
      {isCheckedIn ? 'Checked In' : 'Check In'}
    </Button>
  );
};

export default CheckInButton;
