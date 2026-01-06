import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  full_name: string;
  reason: string;
  verification_type: string;
  status: string;
  submitted_at: string;
  admin_notes: string | null;
}

export const VerificationRequest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<VerificationRequest | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    reason: '',
    verificationType: 'standard',
    socialMediaUrl: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingRequest();
  }, []);

  const fetchExistingRequest = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setExistingRequest(data);
    } catch (error) {
      console.error('Error fetching verification request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.reason.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          full_name: formData.fullName.trim(),
          reason: formData.reason.trim(),
          verification_type: formData.verificationType,
          social_media_url: formData.socialMediaUrl.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Request pending",
            description: "You already have a pending verification request",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Request submitted!",
        description: "Your verification request is under review",
      });

      fetchExistingRequest();
      setFormData({ fullName: '', reason: '', verificationType: 'standard', socialMediaUrl: '' });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Submission failed",
        description: "Could not submit verification request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending Review</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show existing request status
  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Verification Request Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            {getStatusBadge(existingRequest.status)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span>{new Date(existingRequest.submitted_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="outline" className="capitalize">{existingRequest.verification_type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Your verification request is being reviewed. This usually takes 1-3 business days.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show rejected request with option to reapply
  if (existingRequest && existingRequest.status === 'rejected') {
    return (
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            Verification Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            {getStatusBadge(existingRequest.status)}
          </div>
          {existingRequest.admin_notes && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium">Reason:</p>
              <p className="text-sm text-muted-foreground">{existingRequest.admin_notes}</p>
            </div>
          )}
          <Button onClick={() => setExistingRequest(null)} className="w-full">
            Submit New Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Request Verification
        </CardTitle>
        <CardDescription>
          Get a verified badge on your profile to show authenticity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Legal Name *</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verificationType">Verification Type</Label>
            <Select
              value={formData.verificationType}
              onValueChange={(value) => setFormData({ ...formData, verificationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Blue Badge)</SelectItem>
                <SelectItem value="creator">Creator (Purple Badge)</SelectItem>
                <SelectItem value="business">Business (Gold Badge)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialMediaUrl">Social Media Profile (Optional)</Label>
            <Input
              id="socialMediaUrl"
              placeholder="https://instagram.com/yourusername"
              value={formData.socialMediaUrl}
              onChange={(e) => setFormData({ ...formData, socialMediaUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Link to verify your identity</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why should you be verified? *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you're requesting verification..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
