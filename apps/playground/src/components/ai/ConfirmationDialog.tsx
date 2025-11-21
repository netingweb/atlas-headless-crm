import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Edit } from 'lucide-react';

export interface InterruptPreview {
  entity_type: string;
  entity_id: string;
  current_state?: Record<string, unknown>;
  proposed_changes?: Record<string, unknown>;
  action_type: 'update' | 'delete';
}

export interface InterruptToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface ConfirmationDialogProps {
  open: boolean;
  interrupt_tool_call: InterruptToolCall;
  interrupt_preview: InterruptPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  interrupt_preview,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const isDelete = interrupt_preview.action_type === 'delete';
  const entityType = interrupt_preview.entity_type;
  const entityId = interrupt_preview.entity_id;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDelete ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Conferma eliminazione
              </>
            ) : (
              <>
                <Edit className="h-5 w-5 text-yellow-600" />
                Conferma modifica
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? `Stai per eliminare definitivamente questo ${entityType}. Questa azione non può essere annullata.`
              : `Stai per modificare questo ${entityType}. Verifica le modifiche proposte prima di confermare.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-2">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)} ID: {entityId}
            </p>

            {isDelete ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  <strong>Attenzione:</strong> Questa entità verrà eliminata permanentemente dal
                  sistema.
                </p>
                {interrupt_preview.current_state && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium">Entità da eliminare:</p>
                    <pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                      {JSON.stringify(interrupt_preview.current_state, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {interrupt_preview.current_state && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Stato attuale:</p>
                    <div className="bg-gray-50 border rounded-md p-2 max-h-32 overflow-auto">
                      <pre className="text-xs">
                        {JSON.stringify(interrupt_preview.current_state, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                {interrupt_preview.proposed_changes && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Modifiche proposte:</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 max-h-32 overflow-auto">
                      <pre className="text-xs">
                        {JSON.stringify(interrupt_preview.proposed_changes, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button
            variant={isDelete ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="min-w-[100px]"
          >
            {isDelete ? (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </>
            ) : (
              'Conferma'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
