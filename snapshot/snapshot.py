### for cron job
import os
abspath = os.path.abspath(__file__)
dname = os.path.dirname(abspath)
os.chdir(dname)
###

import requests
import json
import configparser
import datetime
import time


class LeanIX:

    def __init__(self):
        self.config = configparser.ConfigParser()
        self.config.read("config.ini")
        self.instance = self.config['MANDATORY']['HOSTNAME']
        self.base_path = "/services/pathfinder/v1"
        self.poll_url = "/services/poll/v2"
        self.apitoken = self.config['MANDATORY']['APITOKEN']
        self.header = None

        #proxy
        http_proxy = self.config['MANDATORY']['HTTP_PROXY']
        https_proxy = self.config['MANDATORY']['HTTPS_PROXY']
        proxy_required = self.config['MANDATORY']['PROXY_REQUIRED']
        self.proxies = {'http': http_proxy, 'https': https_proxy} if proxy_required is True else None

    def connect(self):
        """
        Establish connection to LeanIX API using provided API token
        to receive access token which can be used for further requests
        """
        auth_url = self.instance + "/services/mtm/v1/oauth2/token"
        # get the bearer token - see https://dev.leanix.net/v4.0/docs/authentication
        response = requests.post(auth_url, auth=('apitoken', self.apitoken),
                                 data={'grant_type': 'client_credentials'}, proxies=self.proxies)
        response.raise_for_status()
        self.header = {'Authorization': 'Bearer ' + response.json()['access_token']}

    def get_today_date(self):
        """
        Creates a String representation of today's date based in the format YYYY-MM-DD
        :return: Today's date as String in format YYYY-MM-DD
        """
        today = str(datetime.date.today().year) + "-" + f"{datetime.date.today():%m}" + "-" + f"{datetime.date.today():%d}"  # format date to yyyy-mm-dd
        return today

    def access_leanix_api(self, url, method="GET", data=None, params=None, stream=False):
        """
        Generic function to send requests to LeanIX API
        :param url: Request URL as String to access
        :param method: HTTP method GET (default if not provided), POST or PUT as String
        :param data: JSON data (default None)
        :param params: URL parameter as dictionary (default None)
        :param stream: True if response should be received as stream, otherwise False (default)
        :return: response
        """
        response = None
        if method == "GET":
            response = requests.get(url, headers=self.header, proxies=self.proxies, params=params, data=data, stream=stream)
        elif method == "POST":
            response = requests.post(url, headers=self.header, proxies=self.proxies, params=params, data=data, stream=stream)
        elif method == "PUT":
            response = requests.put(url, headers=self.header, proxies=self.proxies, params=params, data=data, stream=stream)
        response.raise_for_status()
        return response

    def take_snapshot(self):
        """
        Creates a snapshot of current LeanIX data. Data are stored in Excel file.
        Please use the config file (config.ini) for configuring the directory where results are stored.
        """
        print("Creating snapshot...")

        #trigger export
        trigger_export_url = self.instance + self.base_path + "/exports/fullExport"
        self.access_leanix_api(trigger_export_url, method="POST", params={'exportType': 'SNAPSHOT'})
        print("Waiting for snapshot to complete, this may take some time...")

        #get download key
        status = None
        request_key_url = self.instance + self.base_path + "/exports"
        key_params = {'pageSize': 40, 'sorting': 'createdAt', 'sortDirection': "DESC"}

        while status != "COMPLETED":
            self.connect() #refreshing the access token in case that the export takes longer than the validity of the token
            data = self.access_leanix_api(request_key_url, params=key_params, data=json.dumps({'exportType': 'SNAPSHOT'})).json()
            download_key = data["data"][0]["downloadKey"]
            status = data["data"][0]["status"]
            time.sleep(5)


        #request and store data
        print("Snapshot completed. Downloading...")
        download_url = self.instance + self.base_path + "/exports" + "/downloads/" + self.config['MANDATORY']['WORKSPACEID']
        self.header["Accept"] = "application/octet-stream"
        binary = self.access_leanix_api(download_url, params={'key': download_key}, stream=True)

        #write to file
        filename = self.config['OPTIONAL']['EXPORT_FILENAME'].replace("{cdate}", self.get_today_date())
        if binary.status_code == 200:
            with open(filename, 'wb') as file:
                for x in binary.iter_content(1024):
                    file.write(x)
        print("Saved to file ", filename)
        del self.header["Accept"]

    def download_surveys(self):
        """
        Downloads the questions and results for each survey run. Data are stored in an Excel file.
        Please use the config file (config.ini) for configuring the directory where results are stored.
        """
        #get all survey ids
        print("Downloading surveys...")
        request_url = self.instance + self.poll_url + "/polls"
        params = {'workspaceId': self.config['MANDATORY']['WORKSPACEID']}
        survey_ids = self.access_leanix_api(request_url, params=params).json()["data"]

        #get all survey runs
        for survey in [x["id"] for x in survey_ids]:
            run_url = self.instance + self.poll_url + "/polls/" + survey + "/pollRuns"
            runs = self.access_leanix_api(run_url, params=params).json()["data"]

            #get all run results
            for run in [y['id'] for y in runs]:
                print("Survey " + survey + " - Run " + run)
                result_url = self.instance + self.poll_url + "/pollRuns/" + run + "/poll_results.xlsx"
                file = self.access_leanix_api(result_url, params=params)
                filename = self.config['OPTIONAL']['SURVEY_FILENAME'].replace("{cdate}", self.get_today_date()).replace("{id}", survey).replace("{run}", run)
                with open(filename,'wb') as survey_run_result:
                    survey_run_result.write(file.content)


########################################
leanIX = LeanIX()
leanIX.connect()
leanIX.take_snapshot()
leanIX.download_surveys()
