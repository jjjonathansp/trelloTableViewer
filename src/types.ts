export interface TrelloBoard {
  id: string;
  name: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  idList: string;
  checklists?: TrelloChecklist[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
}

export interface CustomColumn {
  id: number;
  control_card_id: string;
  name: string;
}

export interface CustomData {
  card_id: string;
  column_id: number;
  value: string;
}
