import { initDuelistKing, IInitialDuelistKingResult} from './init-duelistking';

export interface IInitialResult extends IInitialDuelistKingResult{
  loaded?: boolean;
}

let result: IInitialResult = <IInitialResult>{};

export async function init(): Promise<IInitialResult> {
  if (typeof result.loaded === 'undefined') {
    return initDuelistKing();
  }
  return result;
}
