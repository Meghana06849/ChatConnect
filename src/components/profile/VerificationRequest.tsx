import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Clock, XCircle, Loader2, Upload, FileText, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  full_name: string;
  reason: string;
  verification_type: string;
  status: string;
  submitted_at: string;
  admin_notes: string | null;
  document_url: string | null;
}

const SIGNED_URL_EXPIRY_SECONDS = 1800; // 30 minutes for security

export const VerificationRequest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<VerificationRequest | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadDocument = async (userId: string): Promise<string | null> => {
    if (!documentFile) return null;

    setUploadingDocument(true);
    try {
      // Generate a unique filename with user ID prefix for RLS
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_document.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, documentFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Store only the file path - we'll use signed URLs when viewing
      return fileName;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    } finally {
      setUploadingDocument(false);
    }
  };

  const viewDocument = async () => {
    if (!existingRequest?.document_url) return;

    setViewingDocument(true);
    try {
      // Generate a signed URL with short expiry for security
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(existingRequest.document_url, SIGNED_URL_EXPIRY_SECONDS);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Could not access document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setViewingDocument(false);
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

      // Upload document if provided
      let documentPath: string | null = null;
      if (documentFile) {
        documentPath = await uploadDocument(user.id);
      }

      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          full_name: formData.fullName.trim(),
          reason: formData.reason.trim(),
          verification_type: formData.verificationType,
          social_media_url: formData.socialMediaUrl.trim() || null,
          document_url: documentPath
        });

      if (error) {
        // If insert failed and we uploaded a document, clean it up
        if (documentPath) {
          await supabase.storage
            .from('verification-documents')
            .remove([documentPath]);
        }

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
      setDocumentFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images and PDFs only)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image (JPG, PNG, WebP) or PDF",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Document must be less than 10MB",
          variant: "destructive"
        });
        return;
      }

      setDocumentFile(file);
    }
    e.target.value = '';
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
          {existingRequest.document_url && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Document</span>
              <Button
                variant="outline"
                size="sm"
                onClick={viewDocument}
                disabled={viewingDocument}
                className="gap-2"
              >
                {viewingDocument ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
                View Document
              </Button>
            </div>
          )}
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
            <Label>Identity Document (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {documentFile ? (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{documentFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDocumentFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Upload ID Document
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Photo ID, passport, or driver's license (JPG, PNG, PDF - max 10MB). 
              Documents are stored securely and accessed only during review.
            </p>
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

          <Button type="submit" className="w-full" disabled={submitting || uploadingDocument}>
            {submitting || uploadingDocument ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingDocument ? 'Uploading Document...' : 'Submitting...'}
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
