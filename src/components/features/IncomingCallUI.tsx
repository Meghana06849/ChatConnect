import React from 'react';
import { useCall } from '@/contexts/CallContext';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const IncomingCallUI: React.FC = () => {
  const { incomingCall, answerCall, declineCall } = useCall();

  if (!incomingCall) {
    return null;
  }

  const { caller, type } = incomingCall;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white text-center">
        <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-green-500">
          {caller.avatar && <AvatarImage src={caller.avatar} />}
          <AvatarFallback className="text-3xl">{caller.name[0]}</AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-bold">{caller.name}</h2>
        <p className="mb-6">is {type === 'video' ? 'video' : 'audio'} calling...</p>
        <div className="flex justify-center gap-4">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={declineCall}
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
          <Button
            variant="success"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={answerCall}
          >
            <Phone className="w-8 h-8" />
          </Button>
        </div>
      </div>
    </div>
  );
};
