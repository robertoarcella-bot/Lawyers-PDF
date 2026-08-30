import { memo, useState, useEffect } from "react";
import CoreToolButton from "@core/components/tools/toolPicker/ToolButton";
import { getToolDisabledReason } from "@app/components/tools/fullscreen/shared";
import {
  useToolWorkflowActions,
  useToolWorkflowData,
} from "@app/contexts/ToolWorkflowContext";
import { useAppConfig } from "@app/contexts/AppConfigContext";
import {
  connectionModeService,
  type ConnectionMode,
} from "@app/services/connectionModeService";

type CoreToolButtonProps = React.ComponentProps<typeof CoreToolButton>;

/**
 * Desktop override of ToolButton.
 * Unavailable tools always render as visually unavailable (dimmed, no badge).
 *
 * Upstream, local mode instead routed them into the tool UI so a "click to sign
 * in" prompt on the execute button could convert the user. This build ships no
 * sign-in flow, so that path would dead-end; a cloud-only tool is simply
 * unavailable here.
 */
const ToolButton: React.FC<CoreToolButtonProps> = (props) => {
  const { toolAvailability } = useToolWorkflowData();
  const { handleToolSelectForced } = useToolWorkflowActions();
  const { config } = useAppConfig();
  const premiumEnabled = config?.premiumEnabled;
  const [connectionMode, setConnectionMode] = useState<ConnectionMode | null>(
    null,
  );

  useEffect(() => {
    void connectionModeService.getCurrentMode().then(setConnectionMode);
    return connectionModeService.subscribeToModeChanges((cfg) =>
      setConnectionMode(cfg.mode),
    );
  }, []);

  const disabledReason = getToolDisabledReason(
    props.id,
    props.tool,
    toolAvailability,
    premiumEnabled,
  );

  // No sign-in to route users toward, so never override the unavailable state.
  void disabledReason;
  void connectionMode;
  void handleToolSelectForced;

  return <CoreToolButton {...props} onUnavailableClick={undefined} />;
};

export default memo(ToolButton);
