# leanix-utils
Currently contains the following LeanIX helpers:
* A __snapshot helper__ to download a full Excel snapshot of a LeanIX workspace as well as the results of all survey runs

      $ python /opt/leanix-utils/snapshot/snapshot.py
      Creating snapshot...
      Waiting for snapshot to complete, this may take some time...
      Snapshot completed. Downloading...
      Saved to file  /opt/leanix-utils/snapshot/snapshot-2020-06-02.xlsx
      Downloading surveys...
      Survey d153626e-d14c-4cb4-a0aa - Run c1472510-7c23-4ae7-8293
      Survey a7afaa28-55b8-4a83-9d90 - Run d1c26fdc-f334-4dc1-86db
      Survey a7afaa28-55b8-4a83-9d90 - Run 97d6e2de-9f5f-4985-b6b4
      Survey a7afaa28-55b8-4a83-9d90 - Run b5b6a33c-0999-4a2e-9aa6

* A __news-feed__ web page providing an overview on the recent changes within your workspace
![News feed screenshot](https://github.com/fnc-eam/leanix-utils/blob/master/news-feed.jpg)

# Getting started
Clone the source files to your server or local IDE:

    git clone https://github.com/fnc-eam/leanix-utils.git

    git clone https://github.com/fnc-eam/leanix-utils.git

# News Feed

## Configuration
Go to the folder *news-feed* > *app*. Open the config.js file and add the following parameters:
* LeanIX instance URL of your company
* Workspace names
* API tokens (see [LeanIX documentation](https://dev.leanix.net/docs/authentication#section-generate-api-tokens) for creating tokens)

In order to access the LeanIX API in a browser outside of leanix.net, we need to set up a few things:
* Option 1: Copy the news feed directory to a web server and ask the LeanIX Support Team to add a CORS whitelist entry for your server hostname.
* Option 2: Install a browser plugin that disables CORS checks (google: "CORS toggle" or "disable same origin policy")

## Usage
* open 'index.html'
* That's it :-)

# Snapshot Helper

## Configuration
Open the file config.ini and add the following parameters:
* API token of production workspace
* Workspace ID of production workspace
* LeanIX instance URL of your company
* __Optional__: Proxy information: Please set the parameter 'PROXY_REQUIRED' to True and add IP address and port number of the proxy
* __Optional__: Custom directory where download results should be stored

You need a Python installation (version 3.x, [download here](https://www.python.org/downloads/)) and the *requests* module (see [installation manual](http://docs.python-requests.org/en/master/user/install/#install)).

## Usage
There are different ways how to run the snapshot helper.

__Command Line__: Navigate to the *snapshot* directory. Run the following command

    python snapshot.py
    
__Local IDE__: Simply right click on the python script and select *run 'snapshot'*.

__Cron Job__: If you want to run the script repeatedly you should add it to a cron job (Linux/Unix).
