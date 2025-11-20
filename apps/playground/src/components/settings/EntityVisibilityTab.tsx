import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { configApi } from '@/lib/api/config';
import {
  playgroundSettingsApi,
  type UnitPlaygroundSettings,
  type EntityVisibility,
} from '@/lib/api/playground-settings';
import { useEntityVisibilityStore } from '@/stores/entity-visibility-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, Database, Search, Key, CheckCircle } from 'lucide-react';

export default function EntityVisibilityTab() {
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setEntityVisibility, setLoading } = useEntityVisibilityStore();

  // Load entities
  const {
    data: entities,
    isLoading: isLoadingEntities,
    error: entitiesError,
  } = useQuery({
    queryKey: ['config-entities', tenantId],
    queryFn: () => configApi.getEntities(tenantId || ''),
    enabled: !!tenantId,
  });

  // Load unit settings
  const {
    data: unitSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ['unit-playground-settings', tenantId, unitId],
    queryFn: () => playgroundSettingsApi.getUnitSettings(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
  });

  // Update store when settings load
  useEffect(() => {
    if (unitSettings?.entityVisibility) {
      setEntityVisibility(unitSettings.entityVisibility);
    }
  }, [unitSettings, setEntityVisibility]);

  // Local state for form
  const [localSettings, setLocalSettings] = useState<Record<string, EntityVisibility>>({});

  // Initialize local state from API data
  useEffect(() => {
    if (unitSettings?.entityVisibility) {
      setLocalSettings(unitSettings.entityVisibility);
    } else if (entities) {
      // Initialize with defaults (all visible)
      const defaults: Record<string, EntityVisibility> = {};
      entities.forEach((entity) => {
        const fields: Record<string, { visibleInList: boolean; visibleInDetail: boolean }> = {};
        entity.fields.forEach((field) => {
          fields[field.name] = {
            visibleInList: true,
            visibleInDetail: true,
            ...(field.type === 'reference' && { visibleInReference: true }),
          };
        });
        defaults[entity.name] = {
          visibleInMenu: true,
          fields,
        };
      });
      setLocalSettings(defaults);
    }
  }, [unitSettings, entities]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: UnitPlaygroundSettings) => {
      return playgroundSettingsApi.updateUnitSettings(tenantId || '', unitId || '', settings);
    },
    onSuccess: (data) => {
      setEntityVisibility(data.entityVisibility || {});
      queryClient.invalidateQueries({ queryKey: ['unit-playground-settings', tenantId, unitId] });
      toast({
        title: 'Settings saved',
        description: 'Entity visibility settings have been saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    },
  });

  const handleEntityMenuToggle = (entityName: string, visible: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [entityName]: {
        ...prev[entityName],
        visibleInMenu: visible,
        fields: prev[entityName]?.fields || {},
      },
    }));
  };

  const handleFieldToggle = (
    entityName: string,
    fieldName: string,
    type: 'visibleInList' | 'visibleInDetail' | 'visibleInReference',
    visible: boolean
  ) => {
    setLocalSettings((prev) => {
      const entity = prev[entityName] || { visibleInMenu: true, fields: {} };
      const field = entity.fields[fieldName] || {
        visibleInList: true,
        visibleInDetail: true,
      };
      return {
        ...prev,
        [entityName]: {
          ...entity,
          fields: {
            ...entity.fields,
            [fieldName]: {
              ...field,
              [type]: visible,
            },
          },
        },
      };
    });
  };

  const handleSave = () => {
    setLoading(true);
    saveMutation.mutate(
      { entityVisibility: localSettings },
      {
        onSettled: () => {
          setLoading(false);
        },
      }
    );
  };

  if (isLoadingEntities || isLoadingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (entitiesError || settingsError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-500">
            <p>Failed to load settings</p>
            <p className="text-sm mt-2">
              {(entitiesError || settingsError) instanceof Error
                ? (entitiesError || settingsError)?.message
                : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>No entities found</p>
            <p className="text-sm mt-2">Configure entities for this tenant first</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Entity Visibility Settings</CardTitle>
          <CardDescription>
            Configure which entities and fields are visible in the menu, lists, and detail pages.
            These settings are specific to this unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {entities
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((entity) => {
                const entitySettings = localSettings[entity.name] || {
                  visibleInMenu: true,
                  fields: {},
                };

                return (
                  <AccordionItem key={entity.name} value={entity.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={entitySettings.visibleInMenu}
                          onCheckedChange={(checked) =>
                            handleEntityMenuToggle(entity.name, checked === true)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-semibold capitalize">{entity.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {entity.fields.length} fields
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="grid gap-4">
                          {entity.fields.map((field) => {
                            const fieldSettings = entitySettings.fields[field.name] || {
                              visibleInList: true,
                              visibleInDetail: true,
                              ...(field.type === 'reference' && { visibleInReference: true }),
                            };

                            const hasEnum =
                              field.validation &&
                              typeof field.validation === 'object' &&
                              'enum' in field.validation &&
                              Array.isArray(field.validation.enum);

                            return (
                              <div key={field.name} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">{field.name}</span>
                                      <Badge variant="outline">{field.type}</Badge>
                                      {field.required && (
                                        <Badge variant="destructive" className="text-xs">
                                          Required
                                        </Badge>
                                      )}
                                      {field.indexed && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs flex items-center gap-1"
                                        >
                                          <Key className="h-3 w-3" />
                                          Indexed
                                        </Badge>
                                      )}
                                      {field.searchable && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs flex items-center gap-1"
                                        >
                                          <Search className="h-3 w-3" />
                                          Searchable
                                        </Badge>
                                      )}
                                      {field.embeddable && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs flex items-center gap-1"
                                        >
                                          <Database className="h-3 w-3" />
                                          Embeddable
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Enum values */}
                                    {hasEnum && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                        <span className="font-medium text-gray-700">
                                          Enum values:{' '}
                                        </span>
                                        <span className="text-gray-600">
                                          {(field.validation as { enum: string[] }).enum.join(', ')}
                                        </span>
                                      </div>
                                    )}

                                    {/* Reference entity */}
                                    {field.type === 'reference' && field.reference_entity && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                        <span className="font-medium text-blue-700">
                                          References:{' '}
                                        </span>
                                        <span className="text-blue-600">
                                          {field.reference_entity}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2 border-t">
                                  <Label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={fieldSettings.visibleInList}
                                      onCheckedChange={(checked) =>
                                        handleFieldToggle(
                                          entity.name,
                                          field.name,
                                          'visibleInList',
                                          checked === true
                                        )
                                      }
                                    />
                                    <Eye className="h-4 w-4" />
                                    <span>Visible in List</span>
                                  </Label>

                                  <Label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={fieldSettings.visibleInDetail}
                                      onCheckedChange={(checked) =>
                                        handleFieldToggle(
                                          entity.name,
                                          field.name,
                                          'visibleInDetail',
                                          checked === true
                                        )
                                      }
                                    />
                                    <Eye className="h-4 w-4" />
                                    <span>Visible in Detail</span>
                                  </Label>

                                  {field.type === 'reference' && (
                                    <Label className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox
                                        checked={fieldSettings.visibleInReference ?? true}
                                        onCheckedChange={(checked) =>
                                          handleFieldToggle(
                                            entity.name,
                                            field.name,
                                            'visibleInReference',
                                            checked === true
                                          )
                                        }
                                      />
                                      <Database className="h-4 w-4" />
                                      <span>Visible in Reference</span>
                                    </Label>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
