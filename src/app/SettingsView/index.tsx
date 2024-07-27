import React, { useEffect, useState } from "react";
import styles from "./styles.module.scss";

import {
  Panel,
  PanelHeader,
  Stack,
  Button,
  Icon,
  IconButton,
  Text,
  Toggle,
  OverlayList,
} from "react-figma-ui/ui";

import { Toast } from "../../components/Toast";
import { ServerSettingsView } from "../ServerSettingsView";

import { pushToJSONBin } from "../../utils/servers/pushToJSONBin";
import { pushToGithub } from "../../utils/servers/pushToGithub";
import { githubPullRequest } from "../../utils/servers/githubPullRequest";
import { pushToGitlab } from "../../utils/servers/pushToGitlab";
import { pushToCustomURL } from "../../utils/servers/pushToCustomURL";

import { downloadTokensFile } from "../../utils/downloadTokensFile";

interface ViewProps {
  JSONsettingsConfig: JSONSettingsConfigI;
  setJSONsettingsConfig: React.Dispatch<
    React.SetStateAction<JSONSettingsConfigI>
  >;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  isCodePreviewOpen: boolean;
  setIsCodePreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setGeneratedTokens: React.Dispatch<React.SetStateAction<object>>;
  currentView: string;
}

const serverList = [
  {
    id: "jsonbin",
    label: "JSONBin",
    iconName: "jsonbin",
  },
  {
    id: "github",
    label: "Github",
    iconName: "github",
  },
  {
    id: "githubPullRequest",
    label: "Github PR",
    iconName: "github",
  },
  {
    id: "gitlab",
    label: "Gitlab",
    iconName: "gitlab",
  },
  {
    id: "customURL",
    label: "Custom URL",
    iconName: "custom-url-server",
  },
];

export const SettingsView = (props: ViewProps) => {
  const toastRef = React.useRef(null);
  const {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    isCodePreviewOpen,
    setIsCodePreviewOpen,
    setGeneratedTokens,
    currentView,
    setCurrentView,
  } = props;
  const [isPushing, setIsPushing] = useState(false);
  const [showServersOverlayList, setShowServersOverlayList] = useState(false);

  const serversHeaderRef = React.useRef(null);

  //////////////////////
  // HANDLE FUNCTIONS //
  //////////////////////

  const handleIncludeScopesChange = (checked: boolean) => {
    // console.log("handleIncludeScopesChange", checked);

    setJSONsettingsConfig({
      ...JSONsettingsConfig,
      includeScopes: checked,
    });
  };

  const handleShowOutput = () => {
    setIsCodePreviewOpen(!isCodePreviewOpen);
    getTokensPreview();
  };

  const handleShowServersOverlayList = () => {
    setShowServersOverlayList(!showServersOverlayList);
  };

  const handleServerView = (serverId: string) => {
    props.setCurrentView(serverId);
    // console.log("serverId", serverId);
  };

  const getTokensPreview = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "preview",
        } as TokensMessageI,
      },
      "*"
    );
  };

  const getTokensForDownload = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "download",
        } as TokensMessageI,
      },
      "*"
    );
  };

  const getTokensForPush = () => {
    setIsPushing(true);

    const allEnabledServers = Object.keys(JSONsettingsConfig.servers).filter(
      (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
    );

    console.log("all enebled servers", allEnabledServers);

    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "getTokens",
          role: "push",
          server: allEnabledServers,
        } as TokensMessageI,
      },
      "*"
    );
  };

  /////////////////
  // USE EFFECTS //
  /////////////////

  // Receive tokens from figma controller
  useEffect(() => {
    window.onmessage = async (event) => {
      const { type, tokens, role, server } = event.data
        .pluginMessage as TokensMessageI;

      if (type === "setTokens") {
        if (role === "preview") {
          console.log("tokens preview", tokens);
          setGeneratedTokens(tokens);
        }

        if (role === "download") {
          console.log("tokens download", tokens);
          downloadTokensFile(tokens);
        }

        if (role === "push") {
          if (server.includes("jsonbin")) {
            console.log("push to jsonbin");
            await pushToJSONBin(
              JSONsettingsConfig.servers.jsonbin,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("github")) {
            // console.log("github config", JSONsettingsConfig.servers.github);
            console.log("push to github");
            await pushToGithub(
              JSONsettingsConfig.servers.github,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("githubPullRequest")) {
            console.log("create github pull request");
            await githubPullRequest(
              JSONsettingsConfig.servers.githubPullRequest,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("gitlab")) {
            console.log("push to gitlab");
            await pushToGitlab(
              JSONsettingsConfig.servers.gitlab,
              tokens,
              (params) => {
                toastRef.current.show(params);
              }
            );
          }

          if (server.includes("customURL")) {
            console.log("push to customURL");
            await pushToCustomURL(JSONsettingsConfig.servers.customURL, tokens);
          }

          setIsPushing(false);
          console.log("push done");
        }
      }
    };
  }, [JSONsettingsConfig]);

  //////////////
  useEffect(() => {
    // reset isPushing to false after 10 second
    if (isPushing) {
      setTimeout(() => {
        setIsPushing(false);
      }, 10000);
    }
  }, [isPushing]);

  //////////////////////
  // RENDER VARIABLES //
  //////////////////////

  const isAllServersEnabled = Object.keys(JSONsettingsConfig.servers).every(
    (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
  );

  const isAnyServerEnabled = Object.keys(JSONsettingsConfig.servers).some(
    (serverId) => JSONsettingsConfig.servers[serverId].isEnabled
  );

  const dynamicServerList = serverList.filter((server) => {
    if (!JSONsettingsConfig.servers[server.id]?.isEnabled) {
      return server;
    }
  });

  //
  useEffect(() => {
    console.log("JSONsettingsConfig Settings View >>>>", JSONsettingsConfig);
  }, [JSONsettingsConfig]);

  /////////////////
  // MAIN RENDER //
  /////////////////

  const mainView = (
    <>
      <Panel>
        <PanelHeader
          title="Show output"
          onClick={handleShowOutput}
          iconButtons={[
            {
              children: <Icon name="sidebar" size="32" />,
              onClick: handleShowOutput,
            },
          ]}
        />
      </Panel>

      <Panel>
        <Stack>
          <Toggle
            id="scope-feature"
            onChange={(checked: boolean) => {
              handleIncludeScopesChange(checked);
            }}
          >
            <Text>Include variable scopes</Text>
          </Toggle>
        </Stack>
      </Panel>
      <Panel>
        <PanelHeader
          ref={serversHeaderRef}
          title="Push to server"
          onClick={handleShowServersOverlayList}
          iconButtons={[
            {
              disabled: isAllServersEnabled,
              children: (
                <>
                  <Icon name="plus" size="32" />
                  {showServersOverlayList && (
                    <OverlayList
                      trigger={serversHeaderRef.current}
                      className={styles.overlayServerList}
                      onOutsideClick={handleShowServersOverlayList}
                      onClick={handleServerView}
                      optionsSections={[
                        {
                          options: dynamicServerList,
                        },
                      ]}
                    />
                  )}
                </>
              ),
              onClick: handleShowServersOverlayList,
            },
          ]}
        />
        {isAnyServerEnabled && (
          <Stack
            hasLeftRightPadding
            hasTopBottomPadding
            gap="var(--space-small)"
          >
            <Stack hasLeftRightPadding={false} gap={4}>
              {Object.keys(JSONsettingsConfig.servers).map(
                (serverId, index) => {
                  if (!JSONsettingsConfig.servers[serverId].isEnabled) {
                    return null;
                  }

                  const server = serverList.find(
                    (server) => server.id === serverId
                  ) as (typeof serverList)[0];

                  return (
                    <Stack
                      className={styles.rowItem}
                      key={index}
                      hasLeftRightPadding={false}
                      direction="row"
                      onClick={() => handleServerView(serverId)}
                      gap={1}
                    >
                      <Icon name={server.iconName} size="32" />
                      <Text className={styles.rowItemText}>{server.label}</Text>
                      <IconButton
                        onClick={() => handleServerView(serverId)}
                        children={<Icon name="kebab" size="32" />}
                      />
                    </Stack>
                  );
                }
              )}
            </Stack>
          </Stack>
        )}
      </Panel>
    </>
  );

  // Select which view to render
  // based on currentView state

  const commonProps = {
    JSONsettingsConfig,
    setJSONsettingsConfig,
    setCurrentView,
  };

  const selectRender = () => {
    if (currentView === "main") {
      return mainView;
    }

    if (currentView === "jsonbin") {
      return <ServerSettingsView {...commonProps} server="jsonbin" />;
    }

    if (currentView === "github") {
      return <ServerSettingsView {...commonProps} server="github" />;
    }

    if (currentView === "gitlab") {
      return <ServerSettingsView {...commonProps} server="gitlab" />;
    }

    if (currentView === "githubPullRequest") {
      return <ServerSettingsView {...commonProps} server="githubPullRequest" />;
    }

    if (currentView === "customURL") {
      return <ServerSettingsView {...commonProps} server="customURL" />;
    }
  };

  const BottomBar = () => {
    if (currentView === "main") {
      return (
        <Panel hasLeftRightPadding topBorder bottomBorder={false}>
          {isAnyServerEnabled && (
            <Stack>
              <Button
                loading={isPushing}
                label="Push to server"
                onClick={getTokensForPush}
                fullWidth
              />
            </Stack>
          )}
          <Stack hasLeftRightPadding hasTopBottomPadding>
            <Button
              label="Download JSON"
              onClick={getTokensForDownload}
              fullWidth
              secondary
            />
          </Stack>
        </Panel>
      );
    }
    else {
      return (<></>);
    }
  }

  return (
    <>
      <Toast ref={toastRef} />
      <Stack
        className={`${styles.settingView} ${
          isCodePreviewOpen ? styles.fitHighToFrame : ""
        }`}
        hasLeftRightPadding={false}
      >
        <div className={styles.dynamicContent}>{selectRender()}</div>
        <BottomBar />
      </Stack>
    </>
  );
};
