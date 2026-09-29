declare module "react-facebook-login" {
  import * as React from "react";

  export type ReactFacebookLoginInfo = {
    id?: string;
    name?: string;
    email?: string;
    picture?: unknown;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
    signedRequest?: string;
    graphDomain?: string;
    data_access_expiration_time?: number;
  };

  export type ReactFacebookFailureResponse = {
    status?: string;
    error?: string;
  };

  type Props = {
    appId: string;
    autoLoad?: boolean;
    version?: string;
    fields?: string;
    scope?: string;
    callback: (response: ReactFacebookLoginInfo | ReactFacebookFailureResponse) => void;
    cssClass?: string;
    textButton?: string;
    disableMobileRedirect?: boolean;
    icon?: React.ReactNode | string;
  };

  export default class FacebookLogin extends React.Component<Props> {}
}
