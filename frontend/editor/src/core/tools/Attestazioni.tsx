import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import { BaseToolProps, ToolComponent } from "@app/types/tool";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import {
  useNavigationActions,
  useNavigationState,
} from "@app/contexts/NavigationContext";
import { useAttestazioniParameters } from "@app/hooks/tools/attestazioni/useAttestazioniParameters";
import { useAttestazioniOperation } from "@app/hooks/tools/attestazioni/useAttestazioniOperation";
import AttestazioniSettings from "@app/components/tools/attestazioni/AttestazioniSettings";
import AttestazioniWorkbenchView from "@app/components/tools/attestazioni/AttestazioniWorkbenchView";
import { AttestazioneTemplate } from "@app/data/attestazioni/attestazioniTemplates";
import {
  ProfiloDifensore,
  caricaModelli,
  caricaProfilo,
} from "@app/data/attestazioni/attestazioniStore";

const WORKBENCH_VIEW_ID = "attestazioniWorkbench";
const WORKBENCH_ID = "custom:attestazioni" as const;

const Attestazioni = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "attestazioni",
    useAttestazioniParameters,
    useAttestazioniOperation,
    props,
  );

  const {
    registerCustomWorkbenchView,
    unregisterCustomWorkbenchView,
    setCustomWorkbenchViewData,
    clearCustomWorkbenchViewData,
  } = useToolWorkflow();
  const navigationState = useNavigationState();
  const { actions: navigationActions } = useNavigationActions();

  // Templates and profile live in browser storage; both panels read the same copy so an
  // edit in the workbench is reflected in the panel's picker without a reload.
  const [modelli, setModelli] = useState<AttestazioneTemplate[]>(() =>
    caricaModelli(),
  );
  const [profilo, setProfilo] = useState<ProfiloDifensore>(() =>
    caricaProfilo(),
  );

  const viewIcon = useMemo(() => <VerifiedOutlinedIcon fontSize="small" />, []);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    registerCustomWorkbenchView({
      id: WORKBENCH_VIEW_ID,
      workbenchId: WORKBENCH_ID,
      label: "Attestazione",
      icon: viewIcon,
      component: AttestazioniWorkbenchView,
    });
    return () => {
      clearCustomWorkbenchViewData(WORKBENCH_VIEW_ID);
      unregisterCustomWorkbenchView(WORKBENCH_VIEW_ID);
    };
    // Register once: re-registering would clear the view's data mid-edit.
  }, []);

  // Keep the workbench view fed with the current parameters, files and stored data.
  useEffect(() => {
    setCustomWorkbenchViewData(WORKBENCH_VIEW_ID, {
      parameters: base.params.parameters,
      onParameterChange: base.params.updateParameter,
      files: base.selectedFiles,
      modelli,
      profilo,
      onProfiloChange: setProfilo,
      onModelliChange: setModelli,
    });
  }, [
    base.params.parameters,
    base.params.updateParameter,
    base.selectedFiles,
    modelli,
    profilo,
    setCustomWorkbenchViewData,
  ]);

  // Open the composer in the main area as soon as the tool is picked.
  useEffect(() => {
    if (navigationState.selectedTool !== "attestazioni") {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    // Let the data effect above land first, or the view renders empty.
    setTimeout(() => {
      navigationActions.setWorkbench(WORKBENCH_ID);
    }, 0);
  }, [navigationActions, navigationState.selectedTool]);

  const settingsContent = (
    <AttestazioniSettings
      parameters={base.params.parameters}
      onParameterChange={base.params.updateParameter}
      modelli={modelli}
      fileCount={base.selectedFiles.length}
    />
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("attestazioni.settings.title", "Attestazione"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        content: settingsContent,
      },
    ],
    executeButton: {
      text: t("attestazioni.submit", "Genera attestazione"),
      loadingText: t("loading"),
      onClick: base.handleExecute,
      isVisible: !base.hasResults,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("attestazioni.results.title", "Attestazione apposta"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default Attestazioni as ToolComponent;
