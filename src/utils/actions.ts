import { AlarmActions, CompiledAlarmActions } from '../types';

export function compileActions(configActions?: Record<string, AlarmActions>) {
  const compiledActions: Record<string, CompiledAlarmActions> = {};

  if (!configActions) {
    return {};
  }

  for (const actionName in configActions) {
    const action = configActions[actionName];

    compiledActions[actionName] = {
      ok: [],
      alarm: [],
      insufficientData: [],
    };

    (['ok', 'alarm', 'insufficientData'] as const).forEach((actionTopicCategory) => {
      const topics = action[actionTopicCategory];

      if (!topics) {
        return;
      }

      if (Array.isArray(topics)) {
        compiledActions[actionName][actionTopicCategory] = topics;
      } else {
        compiledActions[actionName][actionTopicCategory] = [topics];
      }
    });
  }

  return compiledActions;
}

interface SetCFAlarmActionsParams {
  alarmActions?: string[];
  compiledActions: Record<string, CompiledAlarmActions>;
  actionPropertyName: keyof CompiledAlarmActions;
}

export function setCFAlarmAction({ alarmActions, compiledActions, actionPropertyName }: SetCFAlarmActionsParams) {
  const finalActions = [];

  // set actions
  if (alarmActions) {
    alarmActions.forEach((action) => {
      if (action in compiledActions) {
        finalActions.push(...(compiledActions[action][actionPropertyName] ?? []));
      } else {
        throw new Error(`Action ${action} not found in actions`);
      }
    });
  } else {
    finalActions.push(...(compiledActions.default?.[actionPropertyName] ?? []));
  }

  return finalActions;
}
