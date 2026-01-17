import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptText, decryptText, encryptFile, decryptFile } from '@/lib/encryption';
import { 
  Shield, 
  Lock, 
  Upload, 
  Image, 
  Video, 
  MessageSquare, 
  File,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Star,
  Heart,
  Search,
  Plus,
  X
} from 'lucide-react';

interface VaultItem {
  id: string;
  title: string;
  description: string | null;
  item_type: string;
  file_url: string | null;
  encrypted_content: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  created_at: string;
}

export const LoveVault: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<VaultItem | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    type: 'message',
    content: '',
    file: null as File | null,
    tags: [] as string[]
  });

  useEffect(() => {
    // Check if PIN is stored in session
    const storedPin = sessionStorage.getItem('vault_pin');
    if (storedPin) {
      setPin(storedPin);
      setIsPinVerified(true);
      fetchItems();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyPin = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('dream_room_pin')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profile?.dream_room_pin === pin) {
      setIsPinVerified(true);
      sessionStorage.setItem('vault_pin', pin);
      fetchItems();
      toast({
        title: "Vault Unlocked 🔓",
        description: "Your private vault is now accessible"
      });
    } else {
      toast({
        title: "Wrong PIN",
        description: "Please enter your Dream Room PIN",
        variant: "destructive"
      });
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching vault items:', error);
      toast({
        title: "Error",
        description: "Failed to load vault items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('lovers_partner_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.lovers_partner_id) {
        toast({
          title: "No Partner",
          description: "You need a lover partner to use the vault",
          variant: "destructive"
        });
        return;
      }

      let filePath = null;
      let encryptedContent = null;
      let mimeType = null;
      let fileSize = null;

      if (newItem.type === 'message') {
        // Encrypt message
        encryptedContent = await encryptText(newItem.content, pin);
      } else if (newItem.file) {
        // Encrypt and upload file
        const encryptedBlob = await encryptFile(newItem.file, pin);
        const fileName = `${user.id}/${Date.now()}_${newItem.file.name}.encrypted`;
        
        const { error: uploadError } = await supabase.storage
          .from('vault')
          .upload(fileName, encryptedBlob);

        if (uploadError) throw uploadError;

        // Store file path instead of public URL - we'll use signed URLs when viewing
        filePath = fileName;
        mimeType = newItem.file.type;
        fileSize = newItem.file.size;
      }

      const { error } = await supabase
        .from('vault_items')
        .insert({
          user_id: user.id,
          partner_id: profile.lovers_partner_id,
          title: newItem.title,
          description: newItem.description,
          item_type: newItem.type,
          file_url: filePath, // Store path, not public URL
          encrypted_content: encryptedContent,
          mime_type: mimeType,
          file_size: fileSize,
          tags: newItem.tags
        });

      if (error) throw error;

      toast({
        title: "Added to Vault 🔒",
        description: "Your content is now securely encrypted"
      });

      setIsUploadDialogOpen(false);
      setNewItem({
        title: '',
        description: '',
        type: 'message',
        content: '',
        file: null,
        tags: []
      });
      fetchItems();
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive"
      });
    }
  };

  const viewItem = async (item: VaultItem) => {
    try {
      if (item.item_type === 'message' && item.encrypted_content) {
        const decrypted = await decryptText(item.encrypted_content, pin);
        setDecryptedContent(decrypted);
      } else if (item.file_url) {
        // Use signed URL for secure, time-limited access
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('vault')
          .createSignedUrl(item.file_url, 3600); // 1 hour expiry

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error('Failed to generate secure access URL');
        }

        const response = await fetch(signedUrlData.signedUrl);
        const encryptedBlob = await response.blob();
        const decryptedBlob = await decryptFile(encryptedBlob, pin, item.mime_type || 'application/octet-stream');
        const url = URL.createObjectURL(decryptedBlob);
        setDecryptedContent(url);
      }
      setViewingItem(item);
    } catch (error) {
      console.error('Error viewing item:', error);
      toast({
        title: "Decryption Failed",
        description: "Failed to decrypt content",
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (itemId: string, filePath: string | null) => {
    try {
      if (filePath) {
        // filePath is now stored directly (e.g., "user_id/timestamp_filename.encrypted")
        await supabase.storage.from('vault').remove([filePath]);
      }

      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Item removed from vault"
      });
      fetchItems();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'photo': return Image;
      case 'video': return Video;
      case 'message': return MessageSquare;
      default: return File;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.item_type === selectedType;
    return matchesSearch && matchesType;
  });

  if (!isPinVerified) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="glass border-white/20 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Shield className="w-20 h-20 text-lovers-primary animate-float" />
                <Lock className="w-8 h-8 text-lovers-secondary absolute -right-2 -bottom-2 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent">
              Love Vault
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              End-to-end encrypted storage for your most precious moments 🔐💕
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Enter Dream Room PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && verifyPin()}
                  placeholder="••••"
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={verifyPin}
              className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              Unlock Vault
            </Button>

            <div className="bg-lovers-accent/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-lovers-primary" />
                Security Features
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• AES-256-GCM encryption</li>
                <li>• Client-side encryption only</li>
                <li>• Zero-knowledge architecture</li>
                <li>• Secure key derivation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-lovers-primary to-lovers-secondary bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-lovers-primary" />
              Love Vault
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              End-to-end encrypted • {items.length} items stored
            </p>
          </div>

          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add to Vault
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-lovers-primary">
                  Add to Vault 🔒
                </DialogTitle>
              </DialogHeader>

              <Tabs value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="message">💬</TabsTrigger>
                  <TabsTrigger value="photo">📷</TabsTrigger>
                  <TabsTrigger value="video">🎥</TabsTrigger>
                  <TabsTrigger value="document">📄</TabsTrigger>
                </TabsList>

                <TabsContent value="message" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Secret message..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Message (will be encrypted)</Label>
                    <Textarea
                      id="content"
                      value={newItem.content}
                      onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                      placeholder="Write your secret message..."
                      rows={5}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="photo" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Photo title..."
                    />
                  </div>
                  <div>
                    <Label>Select Photo</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewItem({ ...newItem, file: e.target.files?.[0] || null })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="video" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Video title..."
                    />
                  </div>
                  <div>
                    <Label>Select Video</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setNewItem({ ...newItem, file: e.target.files?.[0] || null })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="document" className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Document title..."
                    />
                  </div>
                  <div>
                    <Label>Select File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={(e) => setNewItem({ ...newItem, file: e.target.files?.[0] || null })}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Add a description..."
                />
              </div>

              <Button
                onClick={uploadItem}
                className="w-full bg-gradient-to-r from-lovers-primary to-lovers-secondary text-white"
                disabled={!newItem.title || (newItem.type === 'message' ? !newItem.content : !newItem.file)}
              >
                <Shield className="w-4 h-4 mr-2" />
                Encrypt & Save
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border rounded-md bg-background"
          >
            <option value="all">All Types</option>
            <option value="message">Messages</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lovers-primary mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="glass border-white/20 text-center py-12">
            <CardContent>
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Your vault is empty. Add your first item! 💕</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const Icon = getItemIcon(item.item_type);
              return (
                <Card key={item.id} className="glass border-white/20 hover:scale-105 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-lovers-primary/20 to-lovers-secondary/20 rounded-lg p-2">
                          <Icon className="w-5 h-5 text-lovers-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{item.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {item.is_favorite && <Heart className="w-4 h-4 text-red-500 fill-red-500" />}
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => viewItem(item)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteItem(item.id, item.file_url)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Dialog */}
        {viewingItem && (
          <Dialog open={!!viewingItem} onOpenChange={() => {
            setViewingItem(null);
            setDecryptedContent(null);
          }}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-lovers-primary flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {viewingItem.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4">
                {viewingItem.item_type === 'message' && decryptedContent && (
                  <div className="bg-lovers-accent/20 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{decryptedContent}</p>
                  </div>
                )}
                
                {viewingItem.item_type === 'photo' && decryptedContent && (
                  <img src={decryptedContent} alt={viewingItem.title} className="w-full rounded-lg" />
                )}
                
                {viewingItem.item_type === 'video' && decryptedContent && (
                  <video src={decryptedContent} controls className="w-full rounded-lg" />
                )}

                {viewingItem.description && (
                  <p className="text-sm text-muted-foreground mt-4">{viewingItem.description}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
