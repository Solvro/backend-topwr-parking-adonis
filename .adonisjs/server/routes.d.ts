import "@adonisjs/core/types/http";

type ParamValue = string | number | bigint | boolean;

export type ScannedRoutes = {
  ALL: {
    "parkings.index": { paramsTuple?: []; params?: {} };
    "parkings.extra_info": { paramsTuple?: []; params?: {} };
    "parkings.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  GET: {
    "parkings.index": { paramsTuple?: []; params?: {} };
    "parkings.extra_info": { paramsTuple?: []; params?: {} };
    "parkings.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
  HEAD: {
    "parkings.index": { paramsTuple?: []; params?: {} };
    "parkings.extra_info": { paramsTuple?: []; params?: {} };
    "parkings.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
  };
};
declare module "@adonisjs/core/types/http" {
  export interface RoutesList extends ScannedRoutes {}
}
