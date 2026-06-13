
import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export const LogoutDialog = ({ isOpen, onClose, onConfirm, isLoading }: LogoutDialogProps) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-[425px] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden bg-white">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-br from-red-50 to-white pt-8 pb-6 px-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                        <LogOut className="h-8 w-8 text-red-600" />
                    </div>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-gray-900">
                            Déconnexion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500 mt-2 text-base">
                            Êtes-vous sûr de vouloir quitter votre session ? Vous devrez vous reconnecter pour accéder à votre espace.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>

                {/* Footer with actions */}
                <AlertDialogFooter className="bg-gray-50/50 p-6 flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-center border-t border-gray-100">
                    <AlertDialogCancel asChild>
                        <Button
                            variant="ghost"
                            className="w-full sm:w-auto rounded-xl hover:bg-gray-100 text-gray-600 font-medium h-12 px-6 transition-all duration-200"
                            disabled={isLoading}
                            onClick={onClose}
                        >
                            Rester connecté
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-12 px-8 shadow-lg shadow-red-200 hover:shadow-red-300 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                            disabled={isLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Déconnexion...</span>
                                </div>
                            ) : (
                                "Oui, me déconnecter"
                            )}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
