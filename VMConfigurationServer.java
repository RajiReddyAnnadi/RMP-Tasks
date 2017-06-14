package com.manageengine.rmp.virtual.configuration;

import com.adventnet.customview.CustomViewManager;
import com.adventnet.customview.CustomViewRequest;
import com.adventnet.customview.ViewData;
import com.adventnet.db.api.RelationalAPI;
import com.adventnet.ds.query.*;
import com.adventnet.mfw.bean.BeanUtil;
import com.adventnet.model.table.CVTableModel;
import com.adventnet.persistence.DataAccess;
import com.adventnet.persistence.DataAccessException;
import com.adventnet.persistence.DataObject;
import com.adventnet.persistence.Row;
import com.manageengine.ads.fw.license.LicenseManager;
import com.manageengine.ads.fw.util.CommonUtil;
import com.manageengine.rmp.common.LogWriter;
import com.manageengine.rmp.constants.ErrorCode;
import com.manageengine.rmp.constants.TableName;
import com.manageengine.rmp.licensing.EditionType;
import com.manageengine.rmp.licensing.LicenseUtil;
import static com.manageengine.rmp.licensing.LicenseUtil.getSubscriptionType;
import com.manageengine.rmp.virtual.VMOperations;
import com.manageengine.rmp.virtual.VirtualConstants;
import com.manageengine.rmp.virtual.backup.VMBackupServer;

import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.xml.ws.soap.SOAPFaultException;
import org.json.JSONException;

import com.manageengine.rmp.jni.RMPManagedNative;
import java.util.*;
import com.manageengine.rmp.virtual.HVAgent;
import com.manageengine.rmp.util.winutil.WindowsUtil;
import com.manageengine.rmp.virtual.VirtualMachineUtil;
import com.manageengine.rmp.jni.powershellmanager.PowershellHandler;
import com.manageengine.rmp.common.LogWriter;
import com.manageengine.rmp.virtual.VirtualConstants;
import com.manageengine.rmp.virtual.HVNativeHandler;

/**
 * Created by ebin-4354 on 8/23/2016.
 */
//ignoreI18n_start
public class VMConfigurationServer {

    public static JSONObject getVMServerDetails(JSONArray serverIds, int limit, int range, boolean listAll,int virtualEnvironment) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.getVMServerDetails()");
        try {

            JSONObject returnObject = new JSONObject();

            SelectQuery sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_SERVER_DETAILS));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "HOST_TYPE"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "USERNAME"));
			
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "STATUS"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "VM_COUNT"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "PORT"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DISABLED"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "CONFIG_STATUS"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "VIRTUAL_ENVIRONMENT"));
			sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "FULL_NAME"));

            Criteria criteria = null;
            Criteria virtualCriteria = null;
            ArrayList serverIdArrayList = new ArrayList();

            if (serverIds.length() > 0) {

                for (int i = 0; i < serverIds.length(); i++) {
                    serverIdArrayList.add(serverIds.get(i).toString());
                }

                criteria = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverIdArrayList.toArray(new String[0]), QueryConstants.IN);
            }
            //filter the host based on virtualEnvironment 
            if(virtualEnvironment != -1){
              virtualCriteria = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "VIRTUAL_ENVIRONMENT"), virtualEnvironment, QueryConstants.EQUAL);
              criteria = combineCriteria(criteria, virtualCriteria);
            }

            Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);//only live servers will be retrieved

            sq.setCriteria(combineCriteria(criteria, criteria2));
            if (!listAll) {
                sq.setRange(new Range(range, limit));
            } else {
                sq.setRange(new Range(1, 0));
            }

            sq.addSortColumn(new SortColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), true));

            CustomViewRequest cvRequest = new CustomViewRequest(sq);
            CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
            ViewData viewData = cvManager.getData(cvRequest);
            CVTableModel model = (CVTableModel) viewData.getModel();
            long totalcount = model.getTotalRecordsCount();
            int rowcount = model.getRowCount();

            returnObject.put("total", totalcount);

            JSONArray serversList = new JSONArray();

            for (int i = 0; i < rowcount; i++) {

                JSONObject serverInfo = new JSONObject();
                String hostType = model.getValueAt(i, 0).toString();
                long serverId = (long) model.getValueAt(i, 1);
                Boolean isLicensed = false;
                Long isLicensedCount = 0L;
                int totalCount = 1;
                int cpuSockets = 0;
                int isConfiguredCount = 0;
                //int virtualEnvironment = Integer.valueOf(model.getValueAt(i, 10).toString());

                criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                criteria = criteria.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));
                DataObject dobject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, criteria);
                if (dobject.isEmpty()) {
                    totalCount = 0;
                } else {
                    totalCount = dobject.size(TableName.RMP_VSPHERE_DETAILS);
                }
                if (hostType.equals("1")) {

                    Iterator rowIterator = dobject.getRows(TableName.RMP_VSPHERE_DETAILS, (Criteria) null);
                    while (rowIterator.hasNext()) {
                        Row vsphereRow = (Row) rowIterator.next();
                        cpuSockets = cpuSockets + Integer.parseInt(vsphereRow.get("CPU_SOCKETS").toString());
                        if ((Boolean) vsphereRow.get("IS_LICENSED")) {
                            isLicensedCount++;
                        }
                        if (!isLicensed) {
                            isLicensed = (Boolean) vsphereRow.get("IS_LICENSED");// No I18N
                        }
                        
                        if(virtualEnvironment == VirtualConstants.HYPERV)
                        {
                            if ( Integer.parseInt(vsphereRow.get("CONFIGURATIONSTATUS").toString()) == VirtualConstants.STATUS_CONFIGURED) {
                            isConfiguredCount++;
                            }
                        }

                    }
                } else if (hostType.equals("2")) {  //ESX server

                    Row vsphereRow = dobject.getRow(TableName.RMP_VSPHERE_DETAILS);
                    serverId = (long) vsphereRow.get("VSPHERE_HOST_ID");// No I18N
                    isLicensed = (Boolean) vsphereRow.get("IS_LICENSED");// No I18N
                    cpuSockets = Integer.parseInt(vsphereRow.get("CPU_SOCKETS").toString());
                    
                    if(virtualEnvironment == VirtualConstants.HYPERV)
                    {
                        if (Integer.parseInt(vsphereRow.get("CONFIGURATIONSTATUS").toString()) == VirtualConstants.STATUS_CONFIGURED) {
                            isConfiguredCount++;
                        }
                    }

                }

                String serverName = model.getValueAt(i, 2).toString();
                String userName = model.getValueAt(i, 3).toString();
                String status = model.getValueAt(i, 4).toString();
                long vmCount = (long) model.getValueAt(i, 5);
                Integer port = Integer.parseInt(model.getValueAt(i, 6).toString());
                boolean isDisabled = (boolean) model.getValueAt(i, 7);
                boolean isDeleted = (boolean) model.getValueAt(i, 8);
                String configurationStatus = model.getValueAt(i, 9).toString();
                String environment = VirtualMachineUtil.convertVirtualConstantToName(Integer.parseInt(model.getValueAt(i, 10).toString()));
				String fullName = model.getValueAt(i, 11).toString();
				LogWriter.virtual.info("Inside " + "VMConfigurationServer.getVMServerDetails() FULL_NAME  "+fullName);

                serverInfo.put("serverid", serverId);
                serverInfo.put("servername", serverName);
                serverInfo.put("username", userName);
				serverInfo.put("fullName", fullName);
                serverInfo.put("status", status);
                serverInfo.put("type", hostType);
                serverInfo.put("port", port);
                serverInfo.put("vmcount", vmCount);
                serverInfo.put("isdisabled", isDisabled);
                serverInfo.put("isdeleted", isDeleted);
                serverInfo.put("islicensed", isLicensed);
                serverInfo.put("islicensedcount", isLicensedCount);
                serverInfo.put("cpusockets", cpuSockets);
                serverInfo.put("totalcount", totalCount);//how many vspheres
                serverInfo.put("isConfiguredCount", isConfiguredCount);//how many hyperv servers configured
                serverInfo.put("configurationstatus", configurationStatus);
                serverInfo.put("virtualEnvironment", environment);

                serversList.put(serverInfo);
            }

            returnObject.put("servers", serversList);
            return returnObject;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    //overloaded for individual server Refresh
    public static void updateServerStatus(JSONObject serverDetails) throws JSONException, DataAccessException, Exception {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.updateServerStatus()");
        Long serverId = Long.parseLong(serverDetails.get("serverid").toString());
        if (serverDetails.get("type").toString().equals("2")) {
            serverId = Long.parseLong(getParentServer(Long.parseLong(serverDetails.get("serverid").toString())).get("serverid").toString());
        }
        JSONObject vmDetailsObject = getVMList(serverDetails, (Criteria) null, 1, 0, true);
        JSONArray vmArray = vmDetailsObject.getJSONArray("vmarray");
        ArrayList vmIdList = new ArrayList();

        for (int i = 0; i < vmArray.length(); i++) {
            vmIdList.add(Long.parseLong(vmArray.getJSONObject(i).get("vmid").toString()));
        }

        SelectQuery selectquery = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_BACKUP_OBJECTS));
        selectquery.addSelectColumn(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OBJECTS, "*"));// No I18N
        Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OBJECTS, "VM_ID"), vmIdList.toArray(new Long[0]), QueryConstants.IN);
        selectquery.setCriteria(criteria);

        DataObject dob = CommonUtil.getPersistenceLite().get(selectquery);
        UpdateQuery squery = new UpdateQueryImpl(TableName.RMP_VIRTUAL_SERVER_DETAILS);
        Criteria criteria1 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
        if (dob.isEmpty()) {
            squery.setCriteria(criteria1);
            squery.setUpdateColumn("STATUS", "0");
            //update row
        } else {
            squery.setCriteria(criteria1);
            squery.setUpdateColumn("STATUS", "1");
            //update row
        }
        CommonUtil.getPersistence().update(squery);

    }

    //overloaded for Backtracking from editing of backups
    public static void updateServerStatus(JSONArray vmIds) throws JSONException {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.updateServerStatus()");
        try {
            ArrayList vmIdArray = new ArrayList();
            for (int i = 0; i < vmIds.length(); i++) {
                vmIdArray.add(Long.parseLong(vmIds.getJSONObject(i).get("vmid").toString()));// No I18N
            }

            SelectQuery sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "*"));// No I18N

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, cr, Join.INNER_JOIN);
            sq.addJoin(join);

            cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), QueryConstants.EQUAL);
            join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VIRTUAL_SERVER_DETAILS, cr, Join.INNER_JOIN);
            sq.addJoin(join);

            Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmIdArray.toArray(new Long[0]), QueryConstants.IN);
            sq.setCriteria(criteria);

            DataObject dataObject = CommonUtil.getPersistence().get(sq);
            Iterator rowIterator = dataObject.getRows(TableName.RMP_VIRTUAL_SERVER_DETAILS);

            while (rowIterator.hasNext()) {
                Row row = (Row) rowIterator.next();
                row.set("STATUS", 1);// No I18N
                dataObject.updateRow(row);
            }
            CommonUtil.getPersistence().update(dataObject);

        } catch (Exception ex) {
            ex.printStackTrace();
        }

    }

    //overloaded for Refresh Task
    public static void updateServerStatus() throws JSONException, DataAccessException, Exception {

        JSONArray serverArray = getVMServerDetails(new JSONArray(), 1, 0, true,-1).getJSONArray("servers");//to be checked

        for (int i = 0; i < serverArray.length(); i++) {
            updateServerStatus(serverArray.getJSONObject(i));
        }

    }

    public static JSONArray getVspheres(long serverId) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.getVspheres(" + serverId + ")");
        try {

            Criteria criteria1 = null;
            if (serverId != 0) {
                criteria1 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                //criteria1 = criteria1.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_LICENSED"), true, QueryConstants.EQUAL));
            }
            Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);

            DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, combineCriteria(criteria1, criteria2));
            Iterator vsphereIterator = dataObject.getRows(TableName.RMP_VSPHERE_DETAILS);
            JSONArray vsphereArray = new JSONArray();

            while (vsphereIterator.hasNext()) {

                JSONObject vsphereObject = new JSONObject();
                Row vsphereRow = (Row) vsphereIterator.next();

                long vsphereid = (long) vsphereRow.get("VSPHERE_HOST_ID");// No I18N
                long serverID = (long) vsphereRow.get("SERVER_ID");// No I18N
                String hostName = vsphereRow.get("HOST_NAME").toString();
                Boolean isLicensed = (Boolean) vsphereRow.get("IS_LICENSED");
                int cpuSockets = Integer.parseInt(vsphereRow.get("CPU_SOCKETS").toString());
                String hostID = vsphereRow.get("HOST_ID").toString();
                String virtualEnvironment = vsphereRow.get("VIRTUAL_ENVIRONMENT").toString();
                int configurationStatus =  Integer.parseInt(vsphereRow.get("CONFIGURATIONSTATUS").toString());

                vsphereObject.put("islicensed", isLicensed);
                vsphereObject.put("cpusockets", cpuSockets);
                vsphereObject.put("vsphereid", vsphereid);
                vsphereObject.put("hostname", hostName);
                vsphereObject.put("hostid", hostID);
                vsphereObject.put("serverid", serverID);
                vsphereObject.put("virtualEnvironment", virtualEnvironment);
                vsphereObject.put("configurationstatus", configurationStatus);

                vsphereArray.put(vsphereObject);
            }

            return vsphereArray;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public static JSONObject enableDisableServer(Long serverId, int serverType) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.enableDisableServer(" + serverId + "," + serverType + ")");
        JSONObject returnObject = new JSONObject();
        try {
            if (serverType == 2) {
                Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), serverId, QueryConstants.EQUAL);
                DataObject dobject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, criteria);
                Row vsphereRow = dobject.getFirstRow(TableName.RMP_VSPHERE_DETAILS);
                serverId = Long.parseLong(vsphereRow.get("SERVER_ID").toString());// No I18N
            }
            Criteria c = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
            DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, c);

            Row updateRow = dataObject.getFirstRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);
            if (updateRow.get("IS_DISABLED").toString().equalsIgnoreCase("true")) {
                updateRow.set("IS_DISABLED", false);
                updateRow.set("CONFIG_STATUS", "0");// No I18N

            } else {
                updateRow.set("IS_DISABLED", true);
            }

            dataObject.updateRow(updateRow);
            CommonUtil.getPersistence().update(dataObject);
            if (updateRow.get("IS_DISABLED").toString().equalsIgnoreCase("false")) {
                VMConfigurationServer.refreshServerDetails(new JSONArray().put(serverId));
            }
            returnObject.put("status", true);
            return returnObject;

        } catch (Exception e) {
            try {
                e.printStackTrace();
                returnObject.put("errorCode", ErrorCode.DB_UPDATE_FAILED.getId());
                returnObject.put("errorMsg", ErrorCode.DB_UPDATE_FAILED.getMsg());
            } catch (JSONException ex) {
                ex.printStackTrace();
            }
            return returnObject;
        }
    }

    public static JSONObject userUpdateVMServer(JSONObject serverDetails) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.userUpdateVMServer()");
        JSONObject returnObject = new JSONObject();
        VMOperations vmObject = null;
        ErrorCode errorCode = ErrorCode.CONNECTION_FAILED;
        try {

            long serverId = Long.parseLong(serverDetails.get("serverid").toString());// No I18N//No I18N
            String hostType = serverDetails.get("servertype").toString();// No I18N

            if (hostType.equals("2")) {
                Criteria cri = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), serverId, QueryConstants.EQUAL);
                DataObject dobject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, cri);

                Row vsphereRow = dobject.getRow(TableName.RMP_VSPHERE_DETAILS);
                serverId = (long) vsphereRow.get("SERVER_ID");// No I18N
            }

            Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
            DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, criteria);

            Row updaterow = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);

            String userName = URLDecoder.decode(serverDetails.getString("username"), "UTF-8");// No I18N
			String fullName = URLDecoder.decode(serverDetails.getString("fullName"), "UTF-8");// No I18N
            String password = URLDecoder.decode(serverDetails.getString("password"), "UTF-8");//No I18N
            String serverName = serverDetails.getString("servername");//No I18N
            
            updaterow.set("SERVER_NAME", serverName);// No I18N
            updaterow.set("USERNAME", userName);// No I18N
			updaterow.set("FULL_NAME", fullName);// No I18N
            updaterow.set("PASSWORD", password);// No I18N
            updaterow.set("PORT", serverDetails.get("port"));// No I18N
            updaterow.set("CONFIG_STATUS", "0");// No I18N

            //VMConnection.trustAll();
            URL hostURL = null;
            try {
                hostURL = new URL("https://" + serverName + ":" + serverDetails.get("port").toString() + "/sdk");// No I18N

            } catch (MalformedURLException ex) {
                vmObject = null;
                errorCode = ErrorCode.CONNECTION_FAILED;
                ex.printStackTrace();
            }

            try {
                vmObject = new VMOperations(hostURL, userName, password);
            } catch (NullPointerException e) {
                vmObject = null;
                errorCode = ErrorCode.CONNECTION_FAILED;
                e.printStackTrace();
            } catch (com.vmware.vim25.InvalidLoginFaultMsg ex) {
                vmObject = null;
                errorCode = ErrorCode.AUTHENTICATION_FAILED;
                ex.printStackTrace();
            } catch (SOAPFaultException e) {
                errorCode = ErrorCode.LOCKDOWN_MODE;
                e.printStackTrace();
                vmObject = null;
            } catch (Exception e) {
                errorCode = ErrorCode.CONNECTION_FAILED;
                e.printStackTrace();
                vmObject = null;
            }

            if (vmObject != null) {

                dataObject.updateRow(updaterow);
                CommonUtil.getPersistence().update(dataObject);
                returnObject.put("status", true);
            } else {
                returnObject.put("errorCode", errorCode.getId());
                returnObject.put("errorMsg", errorCode.getMsg());
            }
        } catch (Exception e) {
            try {
                e.printStackTrace();
                returnObject.put("errorCode", ErrorCode.DB_UPDATE_FAILED.getId());
                returnObject.put("errorMsg", ErrorCode.DB_UPDATE_FAILED.getMsg());
            } catch (JSONException ex) {
                ex.printStackTrace();
            }
            return returnObject;
        } finally {
            if (vmObject != null) {
                vmObject.closeConnection();
            }

        }
        return returnObject;
    }

    public static JSONObject getVMList(JSONObject serverdetails, Criteria searchCriteria, int rangeStart, int limit, Boolean listAll)throws Exception {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.getVMList()");
         JSONObject retObject = new JSONObject();
        try {

            SelectQuery sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID", "VHOSTID"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_NAME"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_NAME"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_PROVISIONED_SIZE"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_USED_SIZE"));// No I18N
            sq.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"));// No I18N

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, cr, Join.INNER_JOIN);
            sq.addJoin(join);

            int type = Integer.parseInt(serverdetails.get("type").toString());// No I18N
            long serverId = Long.parseLong(serverdetails.get("serverid").toString());// No I18N

            Criteria criteria = null;
            JSONArray vmsArray = new JSONArray();

            if (type == 1) {

                criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                criteria = criteria.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));
            } else if (type == 2) {
                criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), serverId, QueryConstants.EQUAL);
                criteria = criteria.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));

            }
            Criteria c = combineCriteria(criteria, searchCriteria);
            Criteria crit = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);

            sq.setCriteria(c.and(crit));

            if (!listAll) {
                sq.setRange(new Range(rangeStart, limit));
            } else {
                sq.setRange(new Range(1, 0));
            }

            sq.addSortColumn(new SortColumn(new Column(TableName.RMP_VM_DETAILS, "VM_NAME"), true));
            CustomViewRequest cvRequest = new CustomViewRequest(sq);
            CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
            ViewData viewData = cvManager.getData(cvRequest);
            CVTableModel model = (CVTableModel) viewData.getModel();
            long vmCount = model.getTotalRecordsCount();
            int rowcount = model.getRowCount();


            JSONArray retArray = new JSONArray();

            for (int i = 0; i < rowcount; i++) {

                JSONObject jSONObject = new JSONObject();

                String vsphereHostId = model.getValueAt(i, 0).toString();
                String hostName = model.getValueAt(i, 1).toString();
                long vmId = (long) model.getValueAt(i, 2);
                String VMName = model.getValueAt(i, 3).toString();
                Float provisionedSize = Float.parseFloat(model.getValueAt(i, 4).toString());
                Float usedSize = Float.parseFloat(model.getValueAt(i, 5).toString());
                Boolean isDeleted = (Boolean) model.getValueAt(i, 6);

                if (isDeleted) {
                    if (vmCount >= 0) {
                        vmCount--;
                    }
                    continue;
                }

                jSONObject.put("vspherehostid", vsphereHostId);
                jSONObject.put("hostname", hostName);
                jSONObject.put("vmid", vmId);
                jSONObject.put("vmname", VMName);
                jSONObject.put("provisionedsize", provisionedSize);
                jSONObject.put("usedsize", usedSize);

                retArray.put(jSONObject);
            }
            
            
            retObject.put("vmcount", vmCount);

            retObject.put("vmarray", retArray);
            
            if(vmCount == 0)
            {
                if(!VirtualMachineUtil.isHypervServerConfigured(serverId))
                {
                    throw new Exception(ErrorCode.SERVER_NOTCONFIGURED.getMsg());
                }
            }
            return retObject;

        } catch (Exception e) {
            if(e.getMessage().equals(ErrorCode.SERVER_NOTCONFIGURED.getMsg()))
            {
                e.printStackTrace();
                retObject.put("errorCode", ErrorCode.SERVER_NOTCONFIGURED.getId());
                retObject.put("errorMsg", ErrorCode.SERVER_NOTCONFIGURED.getMsg());
                return retObject;
            }
            else
            {
                e.printStackTrace();
            }
        }

        return null;
    }

    public static JSONObject addVMServer(JSONObject serverDetails) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.addVMServer()");
        JSONObject returnObject = new JSONObject();
        try {
            Long serverId = null;
            Criteria cr = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), serverDetails.get("servername"), QueryConstants.EQUAL);
            DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr);
            Row checkRow = null;

            DataObject serverDataObject = null;

            if (!dataObject.isEmpty()) {
                checkRow = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);
                serverId = Long.parseLong(checkRow.get("SERVER_ID").toString());
                checkRow.set("USERNAME", URLDecoder.decode(serverDetails.get("username").toString(), "UTF-8"));// No I18N
				LogWriter.virtual.info("Indide " + "VMConfigurationServer.addVMServer() FULL_NAME "+URLDecoder.decode(serverDetails.get("fullName").toString()));
				checkRow.set("FULL_NAME", URLDecoder.decode(serverDetails.get("fullName").toString(), "UTF-8"));// No I18N
				
                checkRow.set("PASSWORD", URLDecoder.decode(serverDetails.get("password").toString(), "UTF-8"));// No I18N
                checkRow.set("IS_DELETED", false);// No I18N
                checkRow.set("STATUS", "0");// No I18N
                checkRow.set("CONFIG_STATUS", "0");// No I18N
                dataObject.updateRow(checkRow);

                Criteria crx = new Criteria(new Column(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                serverDataObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, crx);

                if (!serverDataObject.isEmpty()) {
                    Row envDetailsRow = serverDataObject.getFirstRow(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS);
                    envDetailsRow.set("DC_COUNT", Long.parseLong(serverDetails.get("datacentercount").toString()));
                    envDetailsRow.set("VAPP_COUNT", Long.parseLong(serverDetails.get("virtualappcount").toString()));
                    envDetailsRow.set("CLUSTER_COUNT", Long.parseLong(serverDetails.get("clustercount").toString()));
                    serverDataObject.updateRow(envDetailsRow);
                }
            } else {
                Row insertrow = new Row(TableName.RMP_VIRTUAL_SERVER_DETAILS);

                DataAccess.generateValues(insertrow);
                insertrow.set("SERVER_NAME", URLDecoder.decode(serverDetails.get("servername").toString(), "UTF-8"));// No I18N
                insertrow.set("USERNAME", URLDecoder.decode(serverDetails.get("username").toString(), "UTF-8"));// No I18N
				LogWriter.virtual.info("Indide " + "VMConfigurationServer.addVMServer() inserting FULL_NAME "+URLDecoder.decode(serverDetails.get("fullName").toString()));
				insertrow.set("FULL_NAME", URLDecoder.decode(serverDetails.get("fullName").toString(), "UTF-8"));// No I18N
				//insertrow.set("FULL_NAME", serverDetails.get("fullName"));// No I18N
                insertrow.set("PASSWORD", URLDecoder.decode(serverDetails.get("password").toString(), "UTF-8"));// No I18N
                insertrow.set("PORT", Integer.parseInt(serverDetails.get("port").toString()));// No I18N
                insertrow.set("VM_COUNT", Long.parseLong(serverDetails.get("vmcount").toString()));// No I18N
                insertrow.set("STATUS", "0");// No I18N
                insertrow.set("HOST_TYPE", serverDetails.get("servertype"));// No I18N
                insertrow.set("IS_DELETED", false);// No I18N
                insertrow.set("IS_DISABLED", false);// No I18N
                insertrow.set("CONFIG_STATUS", "1");// No I18N
                insertrow.set("VIRTUAL_ENVIRONMENT", 1);// No I18N

                dataObject.addRow(insertrow);
                serverId = (Long) insertrow.get("SERVER_ID");// No I18N

                serverDataObject = CommonUtil.getPersistence().constructDataObject();
                Row envDetailsRow = new Row(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS);
                envDetailsRow.set("SERVER_ID", serverId);
                envDetailsRow.set("DC_COUNT", Long.parseLong(serverDetails.get("datacentercount").toString()));
                envDetailsRow.set("VAPP_COUNT", Long.parseLong(serverDetails.get("virtualappcount").toString()));
                envDetailsRow.set("CLUSTER_COUNT", Long.parseLong(serverDetails.get("clustercount").toString()));
                serverDataObject.addRow(envDetailsRow);

            }
            JSONArray vsphereArray = serverDetails.getJSONArray("vspherearray");// No I18N

            addChildVspheres(serverId, vsphereArray, dataObject);

            Row checkConfig = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS, new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL));
            String configStatus = checkConfig.get("CONFIG_STATUS").toString();

            CommonUtil.getPersistence().update(dataObject);
            CommonUtil.getPersistence().update(serverDataObject);

            if (configStatus.equals("0")) {
                JSONObject refreshObject = refreshServerDetails(new JSONArray().put(serverId));
                if (refreshObject.has("errorCode")) {
                    return refreshObject;
                }
            }

            returnObject.put("status", true);
            returnObject.put("validation", true);
            return returnObject;

        } catch (Exception e) {
            try {
                e.printStackTrace();
                returnObject.put("errorCode", ErrorCode.DB_WRITE_FAILED.getId());
                returnObject.put("errorMsg", ErrorCode.DB_WRITE_FAILED.getMsg());
            } catch (JSONException ex) {
                ex.printStackTrace();
            }
            return returnObject;
        }
    }

    private static void addChildVspheres(long serverId, JSONArray vsphereArray, DataObject dataObject) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.addChildVspheres()");
        try {

            DataObject dobject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, (Criteria) null);
            Long vsphereHostId = null;

            int usableLicenses = LicenseUtil.licenseSubscription() - LicenseUtil.getHostUsage(false);
            boolean autoLicense = false;
            if (usableLicenses >= vsphereArray.length() || LicenseUtil.licenseSubscription() == -1) {
                autoLicense = true;
            }
            dataObject.merge(dobject);

            for (int i = 0; i < vsphereArray.length(); i++) {

                Row checkRow = dataObject.getRow(TableName.RMP_VSPHERE_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_ID"), vsphereArray.getJSONObject(i).get("hostid").toString(), QueryConstants.EQUAL));

                if (checkRow == null) {
                    Row insertrow = new Row(TableName.RMP_VSPHERE_DETAILS);
                    DataAccess.generateValues(insertrow);
                    insertrow.set("SERVER_ID", serverId);
                    insertrow.set("HOST_NAME", vsphereArray.getJSONObject(i).get("hostname"));// No I18N
                    insertrow.set("HOST_ID", vsphereArray.getJSONObject(i).get("hostid"));// No I18N
                    insertrow.set("CPU_SOCKETS", vsphereArray.getJSONObject(i).get("cpupackages"));// No I18N
                    insertrow.set("VERSION", vsphereArray.getJSONObject(i).get("version"));// No I18N
                    insertrow.set("IS_LICENSED", autoLicense);// No I18N
                    insertrow.set("VIRTUAL_ENVIRONMENT", 1);// No I18N
                    insertrow.set("CONFIGURATIONSTATUS", 1);// No I18N

                    dataObject.addRow(insertrow);
                    vsphereHostId = (long) insertrow.get("VSPHERE_HOST_ID");// No I18N

                    refreshVMs(vsphereHostId, vsphereArray.getJSONObject(i).getJSONArray("vmarray"), dataObject, "add");// No I18N

                } else {

                    Row currentServerRow = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS, new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL));
                    currentServerRow.set("CONFIG_STATUS", "0");// No I18N
                    dataObject.updateRow(currentServerRow);

                    Criteria cx = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), Long.parseLong(checkRow.get("SERVER_ID").toString()), QueryConstants.EQUAL);
                    DataObject dummyObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cx);
                    Row existingServerRow = dummyObject.getFirstRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);

                    if (existingServerRow.get("HOST_TYPE").equals(VirtualConstants.ESXI)) {//ESX PARENT
                        existingServerRow.set("IS_DELETED", true);// No I18N
                    } else {//VCENTER PARENT
                        existingServerRow.set("CONFIG_STATUS", "0");// No I18N
                    }
                    dummyObject.updateRow(existingServerRow);
                    CommonUtil.getPersistence().update(dummyObject);

                    checkRow.set("SERVER_ID", serverId);// No I18N
                    checkRow.set("IS_DELETED", false);// No I18N
                    checkRow.set("IS_LICENSED", autoLicense);// No I18N
                    dataObject.updateRow(checkRow);

                }
            }

        } catch (Exception exception) {
            exception.printStackTrace();
        }

    }

    public static JSONObject refreshServerDetails(JSONArray serverIds) throws JSONException {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.refreshServerDetails()");

        JSONArray failedServerArray = new JSONArray();
        JSONObject returnObject = null;
        VMOperations vmOp = null;

        returnObject = new JSONObject();

        ArrayList serverIdArrayList = new ArrayList();
        Criteria cr = null;
        
        DataObject dataObject = null;
        Iterator serverRowIterator = null;
        SelectQuery selectQry = null;
        Criteria cr1 = null;
        Join join = null; 
        if (serverIds.length() > 0) {

            for (int i = 0; i < serverIds.length(); i++) {
                serverIdArrayList.add(serverIds.get(i).toString());
            }
            cr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverIdArrayList.toArray(new String[0]), QueryConstants.IN);
            }
            Criteria deleted = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
            
            Criteria envcr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "VIRTUAL_ENVIRONMENT"), VirtualConstants.VMWARE, QueryConstants.EQUAL);
            deleted = combineCriteria(deleted,envcr);
            
            selectQry = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "*"));
            selectQry.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "*"));
            selectQry.addSelectColumn(new Column(TableName.RMP_VM_DETAILS, "*"));

            cr1 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), QueryConstants.EQUAL);
            join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VIRTUAL_SERVER_DETAILS, cr1, Join.INNER_JOIN);

            selectQry.addJoin(join);

            Criteria cr2 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL);
            Join join2 = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, cr2, Join.INNER_JOIN);

            selectQry.addJoin(join2);

            selectQry.setCriteria(combineCriteria(cr, deleted));
            
            try {
            dataObject = CommonUtil.getPersistence().get(selectQry);
            dataObject.merge(CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, combineCriteria(cr, deleted)));
            serverRowIterator = dataObject.getRows(TableName.RMP_VIRTUAL_SERVER_DETAILS);

            } catch (DataAccessException ex) {
            Logger.getLogger(VMConfigurationServer.class.getName()).log(Level.SEVERE, null, ex);
            returnObject.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
            returnObject.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
            return returnObject;
            }
        

        Boolean notEnteredFlag = true;
        DataObject envDetailsObject = null;
        try {
            envDetailsObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, (Criteria) null);
        } catch (DataAccessException ex) {
            ex.printStackTrace();
        }
        try {

            // Refreshing VMware servers
            if (serverIds.length() > 0)
            {
            while (serverRowIterator.hasNext()) {
                notEnteredFlag = false;
                Row serverRow = (Row) serverRowIterator.next();

                long serverId = (long) serverRow.get("SERVER_ID");// No I18N
                String serverName = serverRow.get("SERVER_NAME").toString();
                String userName = serverRow.get("USERNAME").toString();
                String password = serverRow.get("PASSWORD").toString();
                Integer port = Integer.parseInt(serverRow.get("PORT").toString());

                URL hostURL = null;
                try {
                    hostURL = new URL("https://" + serverName + ":" + port + "/sdk");// No I18N
                } catch (MalformedURLException ex) {
                    ex.printStackTrace();
                }
                vmOp = new VMOperations(hostURL, userName, password);
                JSONObject validatedServerDetails = vmOp.getStructureInfo();

                if (validatedServerDetails.has("error")) {
                    JSONObject refreshStatusCodeObject = new JSONObject();
                    refreshStatusCodeObject.put("serverid", serverId);
                    refreshStatusCodeObject.put("status", "failed");// No I18N
                    refreshStatusCodeObject.put("error", validatedServerDetails.get("error"));// No I18N
                    failedServerArray.put(refreshStatusCodeObject);
                } else {
                    JSONObject serverObject = validatedServerDetails.getJSONObject("serverinfo");// No I18N

                    Row envDetailsRow = envDetailsObject.getRow(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL));
                    envDetailsRow.set("DC_COUNT", Long.parseLong(serverObject.get("datacentercount").toString()));
                    envDetailsRow.set("VAPP_COUNT", Long.parseLong(serverObject.get("virtualappcount").toString()));
                    envDetailsRow.set("CLUSTER_COUNT", Long.parseLong(serverObject.get("clustercount").toString()));
                    envDetailsObject.updateRow(envDetailsRow);

                    serverRow.set("VM_COUNT", Long.parseLong(serverObject.get("vmcount").toString()));// No I18N
                    serverRow.set("CONFIG_STATUS", "1");// No I18N

                    dataObject.updateRow(serverRow);

                    refreshVspheres(serverId, serverObject.getJSONArray("vspherearray"), dataObject);// No I18N

                }

            }

            CommonUtil.getPersistence().update(envDetailsObject);
            CommonUtil.getPersistence().update(dataObject);

            VMBackupServer.updateRMPVirtualBackupObjects();

            if (notEnteredFlag) {

                selectQry = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_SERVER_DETAILS));
                selectQry.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "*"));
                selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "*"));

                cr1 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), QueryConstants.EQUAL);
                join = new Join(TableName.RMP_VIRTUAL_SERVER_DETAILS, TableName.RMP_VSPHERE_DETAILS, cr1, Join.LEFT_JOIN);

                selectQry.addJoin(join);

                dataObject = CommonUtil.getPersistence().get(selectQry);

                for (int i = 0; i < serverIds.length(); i++) {
                    Long serverId = Long.parseLong(serverIds.get(i).toString());
                    cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);

                    serverRowIterator = dataObject.getRows(TableName.RMP_VSPHERE_DETAILS, cr);
                    if (!serverRowIterator.hasNext()) {
                        cr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                        Row serverRow = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr);
                        serverRow.set("VM_COUNT", 0);// No I18N
                        serverRow.set("CONFIG_STATUS", 1);// No I18N
                        dataObject.updateRow(serverRow);
                    }
                }

                CommonUtil.getPersistence().update(dataObject);
            }

            if (failedServerArray.length() > 0) {

                serverIdArrayList.clear();
                for (int k = 0; k < failedServerArray.length(); k++) {
                    serverIdArrayList.add(failedServerArray.getJSONObject(k).get("serverid").toString());
                    if (Integer.parseInt(failedServerArray.getJSONObject(k).get("error").toString()) == 1) {
                        returnObject.put("errorCode", ErrorCode.VCENTER_ALREADY_PRESENT.getId());
                        returnObject.put("errorMsg", ErrorCode.VCENTER_ALREADY_PRESENT.getMsg());
                    } else {
                        returnObject.put("errorCode", ErrorCode.CONNECTION_FAILED.getId());
                        returnObject.put("errorMsg", ErrorCode.CONNECTION_FAILED.getMsg());
                    }
                }
                cr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverIdArrayList.toArray(new String[0]), QueryConstants.IN);

                UpdateQuery squery = new UpdateQueryImpl(TableName.RMP_VIRTUAL_SERVER_DETAILS);
                squery.setCriteria(cr);
                squery.setUpdateColumn("CONFIG_STATUS", "0");
                //update row
                CommonUtil.getPersistence().update(squery);
                return returnObject;
            }

            }
            
            
            returnObject.put("status", true);
            return returnObject;

        } catch (SOAPFaultException e) {
            e.printStackTrace();
            returnObject.put("errorCode", ErrorCode.LOCKDOWN_MODE.getId());
            returnObject.put("errorMsg", ErrorCode.LOCKDOWN_MODE.getMsg());
            return returnObject;
        } catch (Exception ex) {

            ex.printStackTrace();
            returnObject.put("errorCode", ErrorCode.SERVER_REFRESH_FAILED.getId());
            returnObject.put("errorMsg", ErrorCode.SERVER_REFRESH_FAILED.getMsg());
            return returnObject;

        } finally {
            if (vmOp != null) {
                vmOp.closeConnection();
            }

        }
    }

    private static void refreshVspheres(long serverId, JSONArray vsphereArray, DataObject parentDataObject) throws Exception {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.refreshVspheres()");
        ArrayList UUIDList = new ArrayList();

        //DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, cr);
        for (int i = 0; i < vsphereArray.length(); i++) {
            String hostId = vsphereArray.getJSONObject(i).get("hostid").toString();// No I18N
            String hostName = vsphereArray.getJSONObject(i).get("hostname").toString();// No I18N
            int cpuPackages = Integer.parseInt(vsphereArray.getJSONObject(i).get("cpupackages").toString());// No I18N
            String version = vsphereArray.getJSONObject(i).get("version").toString();// No I18N
            UUIDList.add(hostId);

            Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_ID"), hostId, QueryConstants.EQUAL);
            parentDataObject.merge(CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, (Criteria) null));
            Row updateRow = parentDataObject.getRow(TableName.RMP_VSPHERE_DETAILS, criteria);
            Long vsphereHostId = null;

            if (updateRow == null) {

                Row insertrow = new Row(TableName.RMP_VSPHERE_DETAILS);
                DataAccess.generateValues(insertrow);
                insertrow.set("SERVER_ID", serverId);//No I18N
                insertrow.set("HOST_NAME", hostName);//No I18N
                insertrow.set("HOST_ID", hostId);//No I18N
                insertrow.set("CPU_SOCKETS", cpuPackages);//No I18N
                insertrow.set("IS_DELETED", false);//No I18N
                insertrow.set("IS_LICENSED", false);//No I18N
                insertrow.set("VERSION", version);// No I18N
                insertrow.set("VIRTUAL_ENVIRONMENT", 1);// No I18N

                parentDataObject.addRow(insertrow);
                vsphereHostId = (Long) insertrow.get("VSPHERE_HOST_ID");// No I18N

            } else {//must change
                vsphereHostId = (Long) updateRow.get("VSPHERE_HOST_ID");// No I18N
                updateRow.set("SERVER_ID", serverId);//No I18N
                updateRow.set("HOST_NAME", hostName);//No I18N
                updateRow.set("HOST_ID", hostId);//No I18N
                updateRow.set("CPU_SOCKETS", cpuPackages);//No I18N
                updateRow.set("IS_DELETED", false);//No I18N
                updateRow.set("VERSION", version);// No I18N
                updateRow.set("VIRTUAL_ENVIRONMENT", 1);// No I18N
                parentDataObject.updateRow(updateRow);

            }

            if (vsphereArray.getJSONObject(i).has("managementserverip")) {
                Criteria cx = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), hostName, QueryConstants.EQUAL);
                DataObject dummyObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cx);
                Row existingServerRow = dummyObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);

                if (existingServerRow != null) {//ESX PARENT
                    existingServerRow.set("IS_DELETED", true);// No I18N
                    dummyObject.updateRow(existingServerRow);
                    CommonUtil.getPersistence().update(dummyObject);
                }
            }

            refreshVMs(vsphereHostId, vsphereArray.getJSONObject(i).getJSONArray("vmarray"), parentDataObject, "refresh");// No I18N

        }

        Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_ID"), UUIDList.toArray(new String[0]), QueryConstants.NOT_IN);//row Iterator crash ..check out why the fix worked
        Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);

        Iterator rowIterator = parentDataObject.getRows(TableName.RMP_VSPHERE_DETAILS, criteria.and(criteria2));
        while (rowIterator.hasNext()) {
            Row updateRow = (Row) rowIterator.next();
            updateRow.set("IS_DELETED", true);// No I18N
            updateRow.set("IS_LICENSED", false);// No I18N
            parentDataObject.updateRow(updateRow);
        }

//        Criteria deleteCriteria1 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_ID"), UUIDList.toArray(new String[0]), QueryConstants.NOT_IN);
//        Criteria deleteCriteria2 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
//        CommonUtil.getPersistence().delete(deleteCriteria1.and(deleteCriteria2));
    }

    private static void refreshVMs(Long vsphereHostId, JSONArray vmArray, DataObject parentDataObject, String operation) throws Exception {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.refreshVMs()");
        ArrayList UUIDList = new ArrayList();
        for (int i = 0; i < vmArray.length(); i++) {

            String uuid = vmArray.getJSONObject(i).get("uuid").toString();// No I18N
            String biosuuid = vmArray.getJSONObject(i).get("biosuuid").toString();// No I18N

            UUIDList.add(uuid);

            Criteria criteria1 = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "INSTANCE_UUID"), uuid, QueryConstants.EQUAL);
            Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "BIOS_UUID"), biosuuid, QueryConstants.EQUAL);

            parentDataObject.merge(CommonUtil.getPersistence().get(TableName.RMP_VM_DETAILS, (Criteria) (null)));
            Row updateRow = parentDataObject.getRow(TableName.RMP_VM_DETAILS, criteria1.and(criteria2));

            if (updateRow == null) {
                Row insertrow = new Row(TableName.RMP_VM_DETAILS);
                insertrow.set("VSPHERE_HOST_ID", vsphereHostId);
                insertrow.set("VM_NAME", vmArray.getJSONObject(i).get("vmname").toString());// No I18N
                insertrow.set("VM_PROVISIONED_SIZE", Float.parseFloat(vmArray.getJSONObject(i).get("provisionedsize").toString()));
                insertrow.set("VM_USED_SIZE", Float.parseFloat(vmArray.getJSONObject(i).get("usedsize").toString()));
                insertrow.set("INSTANCE_UUID", vmArray.getJSONObject(i).get("uuid").toString());// No I18N
                insertrow.set("BIOS_UUID", vmArray.getJSONObject(i).get("biosuuid").toString());// No I18N
                insertrow.set("RESOURCEPOOL_INFO", vmArray.getJSONObject(i).getJSONObject("resourcepooldetails").toString());// No I18N
                 insertrow.set("VIRTUAL_ENVIRONMENT", 1);//No I18N
                parentDataObject.addRow(insertrow);

            } else {//must change
                updateRow.set("VSPHERE_HOST_ID", vsphereHostId);
                updateRow.set("VM_NAME", vmArray.getJSONObject(i).get("vmname").toString());// No I18N
                updateRow.set("VM_PROVISIONED_SIZE", Float.parseFloat(vmArray.getJSONObject(i).get("provisionedsize").toString()));
                updateRow.set("VM_USED_SIZE", Float.parseFloat(vmArray.getJSONObject(i).get("usedsize").toString()));
                updateRow.set("INSTANCE_UUID", vmArray.getJSONObject(i).get("uuid").toString());// No I18N
                updateRow.set("BIOS_UUID", vmArray.getJSONObject(i).get("biosuuid").toString());// No I18N
                updateRow.set("RESOURCEPOOL_INFO", vmArray.getJSONObject(i).getJSONObject("resourcepooldetails").toString());// No I18N
                updateRow.set("IS_DELETED", false);//No I18N
                updateRow.set("VIRTUAL_ENVIRONMENT", 1);//No I18N

                parentDataObject.updateRow(updateRow);
            }

        }

        if (operation.equalsIgnoreCase("refresh")) {
            Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "INSTANCE_UUID"), UUIDList.toArray(new String[0]), QueryConstants.NOT_IN);//row Iterator crash ..check out why the fix worked
            Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), vsphereHostId, QueryConstants.EQUAL);

            Iterator rowIterator = parentDataObject.getRows(TableName.RMP_VM_DETAILS, criteria.and(criteria2));

            ArrayList VMIdList = new ArrayList();
            while (rowIterator.hasNext()) {
                Row updateRow = (Row) rowIterator.next();
                Long vmId = Long.parseLong(updateRow.get("VM_ID").toString());
                VMIdList.add(vmId);
                updateRow.set("IS_DELETED", true);// No I18N
                parentDataObject.updateRow(updateRow);
            }
        }

    }

    public static Criteria combineCriteria(Criteria criteria1, Criteria criteria2) {
        Criteria c = null;

        if (criteria1 != null && criteria2 != null) {
            c = criteria1;
            c = c.and(criteria2);
        } else if (criteria1 == null) {
            c = criteria2;
        } else {
            c = criteria1;
        }
        return c;
    }

    public static JSONObject getParentServer(long vsphereHostId) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.getParentServer(" + vsphereHostId + ")");
        JSONObject parentServerObject = new JSONObject();

        try {

            SelectQuery sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_SERVER_DETAILS));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "HOST_TYPE"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"));
            sq.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "CONFIG_STATUS"));
            sq.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"));

            Criteria cr1 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VIRTUAL_SERVER_DETAILS, TableName.RMP_VSPHERE_DETAILS, cr1, Join.INNER_JOIN);
            sq.addJoin(join);

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), vsphereHostId, QueryConstants.EQUAL);
            sq.setCriteria(cr);
            sq.addSortColumn(new SortColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), true));

            DataObject dataObject = CommonUtil.getPersistenceLite().get(sq);

            Row serverRow = dataObject.getFirstRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);
            parentServerObject.put("serverid", Long.parseLong(serverRow.get("SERVER_ID").toString()));// No I18N
            parentServerObject.put("servername", serverRow.get("SERVER_NAME").toString());// No I18N
            parentServerObject.put("configstatus", serverRow.get("CONFIG_STATUS").toString());// No I18N
            parentServerObject.put("type", serverRow.get("HOST_TYPE").toString());// No I18N

        } catch (Exception e) {
            e.printStackTrace();
            return null;

        }

        return parentServerObject;
    }

    public static JSONObject deleteServer(long serverId, String serverType) {
        LogWriter.virtual.info("API called: " + "VMConfigurationServer.deleteServer(" + serverId + "," + serverType + ")");
        JSONObject returnObject = new JSONObject();
        try {

            if (serverType.equals("2")) {
                serverId = Long.parseLong(getParentServer(serverId).get("serverid").toString());// No I18N
            }
//            List<String> tableList = new ArrayList<String>();
//            tableList.add(TableName.RMP_VIRTUAL_SERVER_DETAILS);
//            tableList.add(TableName.RMP_VM_DETAILS);
//            tableList.add(TableName.RMP_VSPHERE_DETAILS);

            DataObject dataObject = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, (Criteria) null);

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
            Row row = dataObject.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr);
            if (row == null) {
                throw new Exception();
            } else {
                row.set("IS_DELETED", true);// No I18N
                dataObject.updateRow(row);

                cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
                dataObject.merge(CommonUtil.getPersistence().get(TableName.RMP_VSPHERE_DETAILS, cr));
                Iterator vsphereIterator = dataObject.getRows(TableName.RMP_VSPHERE_DETAILS);

                ArrayList<Long> vsphereIDList = new ArrayList<Long>();
                while (vsphereIterator.hasNext()) {
                    Row vsphereRow = (Row) vsphereIterator.next();

                    vsphereIDList.add(Long.parseLong(vsphereRow.get("VSPHERE_HOST_ID").toString()));

                    vsphereRow.set("IS_DELETED", true);// No I18N
                    vsphereRow.set("IS_LICENSED", false);// No I18N
                    dataObject.updateRow(vsphereRow);
                }

                cr = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), vsphereIDList.toArray(new Long[0]), QueryConstants.IN);
                dataObject.merge(CommonUtil.getPersistence().get(TableName.RMP_VM_DETAILS, cr));
                Iterator vmIterator = dataObject.getRows(TableName.RMP_VM_DETAILS);

                while (vmIterator.hasNext()) {
                    Row vmRow = (Row) vmIterator.next();
                    vmRow.set("IS_DELETED", true);// No I18N
                    dataObject.updateRow(vmRow);
                }

                CommonUtil.getPersistence().update(dataObject);

                VMBackupServer.updateRMPVirtualBackupObjects();

                returnObject.put("status", true);
                return returnObject;
            }

        } catch (Exception e) {
            try {
                e.printStackTrace();
                returnObject.put("errorCode", ErrorCode.DB_WRITE_FAILED.getId());
                returnObject.put("errorMsg", ErrorCode.DB_WRITE_FAILED.getMsg());
                return returnObject;

            } catch (JSONException ex) {
                Logger.getLogger(VMConfigurationServer.class
                        .getName()).log(Level.SEVERE, null, ex);

                return null;
            }
        }

    }

    public static JSONObject getAllVMs(Criteria criteria) {
        JSONObject retObject = new JSONObject();
        try {

            SelectQuery squery = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID", "VHOSTID"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_NAME"));// No I18N 
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_NAME"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_PROVISIONED_SIZE"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_USED_SIZE"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED", "VSPHERE_IS_DELETED"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VIRTUAL_ENVIRONMENT"));// No I18N

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, cr, Join.INNER_JOIN);
            squery.addJoin(join);

            Criteria crit = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);

            if (criteria == null) {
                squery.setCriteria(crit);
            } else {
                squery.setCriteria(combineCriteria(crit, criteria));
            }

            squery.setRange(new Range(1, 0));

            squery.addSortColumn(new SortColumn(new Column(TableName.RMP_VM_DETAILS, "VM_USED_SIZE"), false));

            CustomViewRequest cvRequest = new CustomViewRequest(squery);
            CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
            ViewData viewData = cvManager.getData(cvRequest);
            CVTableModel model = (CVTableModel) viewData.getModel();
            long vmCount = 0L;
            int rowcount = model.getRowCount();

            JSONArray rowArray = new JSONArray();

            for (int i = 0; i < rowcount; i++) {//only 5 we need

                JSONObject rowObject = new JSONObject();
                JSONArray values = new JSONArray();

                JSONObject parentServerObject = getParentServer(Long.parseLong(model.getValueAt(i, 0).toString()));
                String hostName = model.getValueAt(i, 1).toString();

                if (parentServerObject.get("type").toString().equals("2")) {
                    hostName = parentServerObject.get("servername").toString();
                }
                long vmId = (long) model.getValueAt(i, 2);
                String vmName = model.getValueAt(i, 3).toString();
                Float provisionedSize = Float.parseFloat(model.getValueAt(i, 4).toString());
                Float usedSize = Float.parseFloat(model.getValueAt(i, 5).toString());
                Boolean isDeleted = (Boolean) model.getValueAt(i, 6);
                String virtualEnvironment = VirtualMachineUtil.convertVirtualConstantToName(Integer.parseInt(model.getValueAt(i, 8).toString()));

                if (!isDeleted) {
                    vmCount++;
                } else {
                    continue;

                }

                values.put(vmName);
                values.put(String.format("%.02f", provisionedSize) + " GB");
                values.put(String.format("%.02f", usedSize) + " GB");
                values.put(hostName);
                values.put(virtualEnvironment);

                rowObject.put("name", vmName);
                rowObject.put("values", values);
                rowObject.put("id", vmId);
                rowArray.put(rowObject);

            }

            JSONArray tableHeaders = new JSONArray();
            tableHeaders.put("VM Name");
            tableHeaders.put("Provisioned Size");
            tableHeaders.put("Used Size");
            tableHeaders.put("Host Name");
            tableHeaders.put("Virtual Environment");

            retObject.put("rowArray", rowArray);
            retObject.put("maintitle", "List of " + rowArray.length() + " Virtual Machines");
            retObject.put("tableheader", tableHeaders);

            return retObject;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static JSONObject getTopVMs(boolean limit) {
        JSONObject retObject = new JSONObject();
        try {

            SelectQuery squery = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID", "VHOSTID"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "HOST_NAME"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_NAME"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_PROVISIONED_SIZE"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_USED_SIZE"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"));// No I18N
            squery.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VIRTUAL_ENVIRONMENT"));// No I18N

            Criteria criteria0 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, criteria0, Join.INNER_JOIN);
            squery.addJoin(join);

            //Criteria crit = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"), true, QueryConstants.EQUAL);
            Criteria criteria = null;
            JSONArray vmArray = getTopVMIDList(new ArrayList());

            ArrayList vmIdList = new ArrayList();

            if (vmArray.length() <= 0) {
                return null;
            } else {

                for (int i = 0; i < vmArray.length(); i++) {
                    vmIdList.add(vmArray.getJSONObject(i).getLong("vmid"));
                }
                criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmIdList.toArray(new Long[0]), QueryConstants.IN);
            }
            squery.setCriteria(criteria);

            squery.addSortColumn(new SortColumn(new Column(TableName.RMP_VM_DETAILS, "VM_USED_SIZE"), false));
            squery.setRange(new Range(1, 0));

            CustomViewRequest cvRequest = new CustomViewRequest(squery);
            CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
            ViewData viewData = cvManager.getData(cvRequest);
            CVTableModel model = (CVTableModel) viewData.getModel();
            int rowcount = model.getRowCount();

            int limitValue = 0;
            if (limit) {
                limitValue = 5;
            } else {
                limitValue = rowcount;
            }
            JSONArray rowArray = new JSONArray();

            for (int i = 0; i < rowcount && rowArray.length() < limitValue; i++) {//only 5 we need

                JSONObject rowObject = new JSONObject();
                JSONArray values = new JSONArray();

                JSONObject parentServerObject = getParentServer(Long.parseLong(model.getValueAt(i, 0).toString()));
                String hostName = model.getValueAt(i, 1).toString();

                if (parentServerObject.getString("type").equals("2")) {
                    hostName = parentServerObject.getString("servername");
                }
                long vmId = (long) model.getValueAt(i, 2);
                String VMName = model.getValueAt(i, 3).toString();
                Float provisionedSize = Float.parseFloat(model.getValueAt(i, 4).toString());
                Float usedSize = Float.parseFloat(model.getValueAt(i, 5).toString());
                Boolean isDeleted = (Boolean) model.getValueAt(i, 6);
                String virtualEnvironment = VirtualMachineUtil.convertVirtualConstantToName(Integer.parseInt(model.getValueAt(i, 7).toString()));

                //if (!isDeleted) {
                    values.put(VMName);
                    String formattedFloat = String.format("%.02f", provisionedSize);
                    values.put(hostName);
                    values.put(virtualEnvironment);
                    values.put(formattedFloat + " GB");
                    rowObject.put("name", VMName);
                    rowObject.put("values", values);
                    rowObject.put("id", vmId);
                    rowArray.put(rowObject);
                //}

            }

            for (int i = 0; i < rowArray.length(); i++) {
                Long vmId = rowArray.getJSONObject(i).getLong("id");
                for (int j = 0; j < vmArray.length(); j++) {
                    if (vmId == vmArray.getJSONObject(j).getLong("vmid")) {
                        rowArray.getJSONObject(i).getJSONArray("values").put(vmArray.getJSONObject(j).get("backupsize"));
                        rowArray.getJSONObject(i).put("backupsize", vmArray.getJSONObject(j).get("backupsize"));
                        break;
                    }
                }
            }

//            for (int i = 0; i < vmArray.length() && i < 5; i++) {
//                Long vmId = vmArray.getJSONObject(i).getLong("vmid");
//                for (int j = 0; j < rowArray.length(); j++) {
//                    if (vmId == rowArray.getJSONObject(j).getLong("id")) {
//
//                        vmArray.getJSONObject(i).put("values", rowArray.getJSONObject(j).getJSONArray("values").put(vmArray.getJSONObject(i).get("backupsize")));
//                        vmArray.getJSONObject(i).put("name", rowArray.getJSONObject(j).getString("name"));
//                        vmArray.getJSONObject(i).put("id", vmId);
//
//                        break;
//                    }
//                }
//            }
            JSONArray sortedJsonArray = new JSONArray();

            List<JSONObject> jsonValues = new ArrayList<JSONObject>();
            for (int i = 0; i < rowArray.length(); i++) {
                jsonValues.add(rowArray.getJSONObject(i));
            }
            Collections.sort(jsonValues, new Comparator<JSONObject>() {
                private static final String KEY_NAME = "backupsize";

                @Override
                public int compare(JSONObject a, JSONObject b) {
                    Float valA = 0F;
                    Float valB = 0F;

                    try {
                        valA = new Float(a.getString(KEY_NAME).substring(0, a.getString(KEY_NAME).length() - 3));//" GB" trimmed
                        valB = new Float(b.getString(KEY_NAME).substring(0, b.getString(KEY_NAME).length() - 3));//" GB" trimmed
                    } catch (JSONException e) {
                        e.printStackTrace();
                        return -1;
                    }

                    return -valA.compareTo(valB);
                    //if you want to change the sort order, simply use the following:
                    //return -valA.compareTo(valB);
                }
            });

            for (int i = 0; i < rowArray.length(); i++) {
                sortedJsonArray.put(jsonValues.get(i));
            }
            JSONArray tableHeaders = new JSONArray();
            tableHeaders.put("VM Name");
            tableHeaders.put("Host Name");
            tableHeaders.put("Virtual Environment");
            tableHeaders.put("Provisioned Size");
            tableHeaders.put("Total Backup Size");

            retObject.put("rowArray", sortedJsonArray);
            //retObject.put("maintitle", "Top " + sortedJsonArray.length() + " Virtual Machines by Backup Size");
            retObject.put("maintitle", "Top Virtual Machines by Backup Size");
            retObject.put("tableheader", tableHeaders);

            return retObject;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static JSONArray getTopVMIDList(ArrayList backupIdentifierList) {
        JSONArray vmArray = new JSONArray();
        Table table1 = new Table(TableName.RMP_VM_BACKEDUP_DETAILS);
        SelectQuery squery = new SelectQueryImpl(table1);
        
        Criteria criteria =null;
        if(!backupIdentifierList.isEmpty())
        {
            new Criteria(Column.getColumn(TableName.RMP_VM_BACKEDUP_DETAILS, "BACKUP_IDENTIFIER"), backupIdentifierList.toArray(new String[0]), QueryConstants.IN);
        }
        squery.setCriteria(criteria);
        
        ArrayList colList = new ArrayList();

        Column col1 = new Column(TableName.RMP_VM_BACKEDUP_DETAILS, "VM_ID");
        Column col2 = new Column(TableName.RMP_VM_BACKEDUP_DETAILS, "BACKUP_SIZE").summation();
        col2.setColumnAlias("VM_BACKUP_SIZE");

        colList.add(col1);
        colList.add(col2);

        squery.addSelectColumns(colList);

        List groupList = new ArrayList();
        groupList.add(col1);
        GroupByClause gr = new GroupByClause(groupList);
        squery.setGroupByClause(gr);

        SortColumn sc = new SortColumn(col2, false);
        squery.addSortColumn(sc);

        java.sql.Connection c = null;
        DataSet ds = null;

        try {
            c = RelationalAPI.getInstance().getConnection();
            ds = RelationalAPI.getInstance().executeQuery(squery, c);

            while (ds.next()) {
                JSONObject vmObject = new JSONObject();
                Long vmId = Long.parseLong(ds.getValue("VM_ID").toString());
                Long backupSize = Long.parseLong(ds.getValue("VM_BACKUP_SIZE").toString());

                Float temp = (Float.parseFloat(backupSize.toString()) / (1024 * 1024 * 1024));
                String formattedFloat = String.format("%.02f", temp);
                vmObject.put("vmid", vmId);
                vmObject.put("backupsize", formattedFloat + " GB");
//                vmObject.put("backupsize", Float.parseFloat(formattedFloat));

                vmArray.put(vmObject);
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (ds != null) {
                try {
                    ds.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if (c != null) {
                try {
                    c.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        return vmArray;

    }

    public static JSONArray getVMUsage(Long vmid) {
        JSONArray backupArray = new JSONArray();
        java.sql.Connection c = null;
        DataSet dsub = null;
        try {

            SelectQuery squery = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_BACKUP_OPERATION));
            squery.addSelectColumn(new Column(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_ID"));

            Column sizeCol = new Column(TableName.RMP_VM_BACKEDUP_DETAILS, "BACKUP_SIZE").summation();
            sizeCol.setColumnAlias("VM_SIZE");

            squery.addSelectColumn(sizeCol);

            List groupList1 = new ArrayList();
            groupList1.add(new Column(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_ID"));
            GroupByClause gr1 = new GroupByClause(groupList1);
            squery.setGroupByClause(gr1);

            Criteria cr = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_IDENTIFIER"), Column.getColumn(TableName.RMP_VM_BACKEDUP_DETAILS, "BACKUP_IDENTIFIER"), QueryConstants.EQUAL);
            Join join = new Join(TableName.RMP_VIRTUAL_BACKUP_OPERATION, TableName.RMP_VM_BACKEDUP_DETAILS, cr, Join.LEFT_JOIN);
            squery.addJoin(join);

            Criteria crux = new Criteria(Column.getColumn(TableName.RMP_VM_BACKEDUP_DETAILS, "VM_ID"), vmid, QueryConstants.EQUAL);
            squery.setCriteria(crux);

            c = RelationalAPI.getInstance().getConnection();
            dsub = RelationalAPI.getInstance().executeQuery(squery, c);

            while (dsub.next()) {

                JSONObject backupObject = new JSONObject();
                Long vmSizeForThisBackup = Long.parseLong(dsub.getValue("VM_SIZE").toString());

                Float temp = (Float.parseFloat(vmSizeForThisBackup.toString()) / (1024 * 1024 * 1024));
                String formattedFloat = String.format("%.02f", temp);

                Long backupId = Long.parseLong(dsub.getValue("BACKUP_ID").toString());
                backupObject.put("backupid", backupId);
                backupObject.put("vmsize", formattedFloat);

                DataObject dobj = CommonUtil.getPersistenceLite().get(TableName.RMP_VIRTUAL_BACKUP_SCHEDULE, (Criteria) null);
                Row row = dobj.getRow(TableName.RMP_VIRTUAL_BACKUP_SCHEDULE, new Criteria(new Column(TableName.RMP_VIRTUAL_BACKUP_SCHEDULE, "BACKUP_ID"), backupId, QueryConstants.EQUAL));
                backupObject.put("backupname", row.get("BACKUP_SCHEDULE_NAME").toString());

                dobj = CommonUtil.getPersistenceLite().get(TableName.RMP_VIRTUAL_BACKUP_OPERATION, new Criteria(new Column(TableName.RMP_VIRTUAL_BACKUP_SCHEDULE, "BACKUP_ID"), backupId, QueryConstants.EQUAL));
                Iterator i = dobj.getRows(TableName.RMP_VIRTUAL_BACKUP_OPERATION);

                Long backupSize = 0L;

                while (i.hasNext()) {
                    Row r = (Row) i.next();
                    backupSize = backupSize + Long.parseLong(r.get("BACKUP_SIZE").toString());
                }

                temp = (Float.parseFloat(backupSize.toString()) / (1024 * 1024 * 1024));
                formattedFloat = String.format("%.02f", temp);

                backupObject.put("backupsize", formattedFloat);

                backupArray.put(backupObject);
            }

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (dsub != null) {
                try {
                    dsub.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if (c != null) {
                try {
                    c.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        return backupArray;
    }

    public static JSONObject getDashboardData() {

        try {
            JSONObject retObject = new JSONObject();

            JSONArray serverArray = getVMServerDetails(new JSONArray(), 1, 1, true,-1).getJSONArray("servers");
//            ArrayList vsphereIdList = new ArrayList();
            Long totalVMCount = 0L;
            Long vsphereCount = 0L;
            Long vcenterCount = 0L;
            Long safeVMCount = 0L;
            Long allVMsCount = 0L;
            Long outOfSyncServers = 0L;

//            DataObject dobj = CommonUtil.getPersistenceLite().get(TableName.RMP_VSPHERE_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));
//            Iterator itr = dobj.getRows(TableName.RMP_VSPHERE_DETAILS);
//            while (itr.hasNext()) {
//                Row row = (Row) itr.next();
//                vsphereIdList.add(Long.parseLong(row.get("VSPHERE_HOST_ID").toString()));
//            }
            for (int i = 0; i < serverArray.length(); i++) {
                JSONObject serverObject = serverArray.getJSONObject(i);

                if (!Boolean.parseBoolean(serverObject.get("isdeleted").toString())) {
                    totalVMCount = totalVMCount + Long.parseLong(serverObject.get("vmcount").toString());

                    //JSONArray vsphereArray = getVspheres(serverObject.getLong("serverid"));
                    //for (int k = 0; k < vsphereArray.length(); k++) {
                    //    vsphereIdList.add(vsphereArray.getJSONObject(i).getLong("vsphereid"));
                    //}
                    //commented for host count
//                    if (serverObject.getString("type").equals("1")) {
//                        vsphereCount = vsphereCount + serverObject.getInt("totalcount");
//                        vcenterCount++;
//                    } else {
//                        vsphereCount = vsphereCount + serverObject.getInt("totalcount");
//                    }
                    vsphereCount++;
                    if (serverObject.get("configurationstatus").toString().equals("0")) {
                        outOfSyncServers++;
                    }
                }

            }

            retObject.put("totalvmcount", totalVMCount);
            retObject.put("servercount", vsphereCount);
            retObject.put("vcentercount", vcenterCount);
            retObject.put("outofsync", outOfSyncServers);

            SelectQuery sq = new SelectQueryImpl(new Table(TableName.RMP_VM_BACKEDUP_DETAILS));
            Column safeCount = new Column(TableName.RMP_VM_BACKEDUP_DETAILS, "VM_ID").distinct().count();
            safeCount.setColumnAlias("SAFE_VM_COUNT");
            sq.addSelectColumn(safeCount);

//            SelectQuery sq1 = new SelectQueryImpl(new Table(TableName.RMP_VM_DETAILS));
//            Column allvmsCount = new Column(TableName.RMP_VM_DETAILS, "VM_ID").distinct().count();
//            allvmsCount.setColumnAlias("ALL_VM_COUNT");
//            sq1.addSelectColumn(allvmsCount);
//            sq1.setCriteria(new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), vsphereIdList.toArray(new Long[0]), QueryConstants.IN));
            java.sql.Connection c = null;
            DataSet ds = null;
            try {
                c = RelationalAPI.getInstance().getConnection();
                ds = RelationalAPI.getInstance().executeQuery(sq, c);

                while (ds.next()) {
                    safeVMCount = Long.parseLong(ds.getValue("SAFE_VM_COUNT").toString());
                }

//                ds = RelationalAPI.getInstance().executeQuery(sq1, c);
//                while (ds.next()) {
//                    allVMsCount = Long.parseLong(ds.getValue("ALL_VM_COUNT").toString());
//                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                if (ds != null) {
                    try {
                        ds.close();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                if (c != null) {
                    try {
                        c.close();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

            }

            Criteria criteria = null;
            JSONArray vmArray = VMConfigurationServer.getTopVMIDList(new ArrayList());

            ArrayList vmIdList = new ArrayList();

//            if (vmArray.length() <= 0) {
//                return null;
//            } else {
//
//                for (int i = 0; i < vmArray.length(); i++) {
//                    vmIdList.add(vmArray.getJSONObject(i).getLong("vmid"));
//                }
//                criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmIdList.toArray(new Long[0]), QueryConstants.NOT_IN);
//            }
            if (vmArray.length() > 0) {

                for (int i = 0; i < vmArray.length(); i++) {
                    vmIdList.add(Long.parseLong(vmArray.getJSONObject(i).get("vmid").toString()));
                }
            }
            criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmIdList.toArray(new Long[0]), QueryConstants.NOT_IN);
            criteria = criteria.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));
            JSONObject jsono = VMConfigurationServer.getAllVMs(criteria);
            retObject.put("safevmcount", safeVMCount);
            retObject.put("unsafevmcount", jsono.getJSONArray("rowArray").length());

            //Manjiniz Code starts Here
            JSONObject hosts = new JSONObject();
            //to get the subscribed sockets count
            int subscribed = 0;
            JSONObject componentDetails = LicenseManager.getComponentDetails();
            String noOfHosts = componentDetails.has("VSPHEREHOSTS") ? new JSONObject((componentDetails.get("VSPHEREHOSTS").toString())).get("NumberOfHosts").toString() : (getSubscriptionType(LicenseManager.getLicenseDetails()) == EditionType.Free.ordinal()) ? "0" : "1";
            if (noOfHosts.equalsIgnoreCase("unlimited")) {
                subscribed = -1;
            } else {
                subscribed = Integer.parseInt(noOfHosts);
            }
            hosts.put("subscribed", subscribed);
            //to get the no of sockets configured and licensed
            int configured = 0, licensed = 0;
//            sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
//            sq.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "CPU_SOCKETS"));// No I18N
//            sq.addSelectColumn(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_LICENSED"));// No I18N
//
//            sq.setCriteria(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));
//            sq.addSortColumn(new SortColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "CPU_SOCKETS"), false));
//            sq.setRange(new Range(1, 0));
//
//            CustomViewRequest cvRequest = new CustomViewRequest(sq);
//            CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
//            ViewData viewData = cvManager.getData(cvRequest);
//            CVTableModel model = (CVTableModel) viewData.getModel();
//            int rowcount = model.getRowCount();
//            for (int i = 0; i < rowcount; i++) {
//                configured += Integer.parseInt(model.getValueAt(i, 0).toString());
//                if (Boolean.parseBoolean(model.getValueAt(i, 1).toString())) {
//                    licensed++;
//                }
//            }

            DataObject dox = CommonUtil.getPersistenceLite().get(TableName.RMP_VSPHERE_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL));

            if (dox.isEmpty()) {
                configured = 0;
            } else {
                configured = dox.size(TableName.RMP_VSPHERE_DETAILS);
            }

            Iterator itr = dox.getRows(TableName.RMP_VSPHERE_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_LICENSED"), true, QueryConstants.EQUAL));
            while (itr.hasNext()) {
                itr.next();
                licensed++;
            }
            hosts.put("configured", configured);
            hosts.put("licensed", licensed);
            retObject.put("hosts", hosts);//socket data

            //to get the backup status
//            JSONObject schedule = new JSONObject();
//            sq = new SelectQueryImpl(Table.getTable(TableName.RMP_VIRTUAL_BACKUP_OPERATION));
//            sq.addSelectColumn(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_STATUS"));// No I18N
//            Calendar cal = Calendar.getInstance();
//            cal.add(Calendar.DATE, -1);
//            Timestamp t = new Timestamp(cal.getTime().getTime());
//            Criteria cr1 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_TIME"), t, QueryConstants.GREATER_THAN);
//            sq.setCriteria(cr1);
//            sq.addSortColumn(new SortColumn(Column.getColumn(TableName.RMP_VIRTUAL_BACKUP_OPERATION, "BACKUP_IDENTIFIER"), true));
//            sq.setRange(new Range(1, 0));
//            cvRequest = new CustomViewRequest(sq);
//            cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
//            viewData = cvManager.getData(cvRequest);
//            model = (CVTableModel) viewData.getModel();
//            rowcount = model.getRowCount();
//            int success = 0, failed = 0, running = 0;
//            for (int i = 0; i < rowcount; i++) {
//                if (model.getValueAt(i, 0).toString().equalsIgnoreCase("finished")) {
//                    success++;
//                } else if (model.getValueAt(i, 0).toString().equalsIgnoreCase("failed") || model.getValueAt(i, 0).toString().equalsIgnoreCase("Interrupted")) {
//                    failed++;
//                } else {
//                    running++;
//                }
//            }
//            schedule.put("success", success);
//            schedule.put("failed", failed);
//            schedule.put("running", running);
//            retObject.put("schedule", schedule);//schedule data
            //Manjiniz Code Ends Here
            //This is my own code
            JSONObject schedule = new JSONObject();
            JSONObject scheduleStats = VMBackupServer.getLast24HoursStats();
            schedule.put("success", scheduleStats.getJSONArray("finished").length());
            schedule.put("failed", scheduleStats.getJSONArray("failed").length());
            schedule.put("running", scheduleStats.getJSONArray("running").length());
            retObject.put("schedule", schedule);//schedule data

            return retObject;

        } catch (Exception ex) {
            ex.printStackTrace();
            return null;
        }
    }

    public static JSONObject getParentHost(Long destHostId, Long vmId) {

        JSONObject parentHostObject = new JSONObject();
        if (destHostId.compareTo(0L) == 0) {
            try {

                SelectQuery squery = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID", "VHOSTID"));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "HOST_ID", "UNIQUE_HOST_ID"));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "HOST_NAME"));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "IS_LICENSED" ));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "BACKUP_FILTER_TIME"));
                squery.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"));
                squery.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DISABLED"));
                squery.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED","DELETED"));
                squery.addSelectColumn(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"));

                squery.addSortColumn(new SortColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID", "VHOSTID"), true));
                squery.setRange(new Range(1, 0));
                squery.setCriteria(new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmId, QueryConstants.EQUAL));

                Join join1 = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VM_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), Column.getColumn(TableName.RMP_VM_DETAILS, "VSPHERE_HOST_ID"), QueryConstants.EQUAL), Join.INNER_JOIN);
                squery.addJoin(join1);

                Join join2 = new Join(TableName.RMP_VSPHERE_DETAILS, TableName.RMP_VIRTUAL_SERVER_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), QueryConstants.EQUAL), Join.INNER_JOIN);
                squery.addJoin(join2);

                CustomViewRequest cvRequest = new CustomViewRequest(squery);
                CustomViewManager cvManager = (CustomViewManager) BeanUtil.lookup("TableViewManager");// No I18N
                ViewData viewData = cvManager.getData(cvRequest);
                CVTableModel model = (CVTableModel) viewData.getModel();
                int rowcount = model.getRowCount();
                for (int i = 0; i < rowcount; i++) {
                    parentHostObject.put("vspherehostid", Long.parseLong(model.getValueAt(i, 0).toString()));
                    parentHostObject.put("hostid", (model.getValueAt(i, 1).toString()));
                    parentHostObject.put("hostname", (model.getValueAt(i, 2).toString()));
                    parentHostObject.put("islicensed", Boolean.parseBoolean(model.getValueAt(i, 3).toString()));
                    parentHostObject.put("isdeleted", Boolean.parseBoolean(model.getValueAt(i, 5).toString()));
                    parentHostObject.put("parentserverdisabled", Boolean.parseBoolean(model.getValueAt(i, 6).toString()));
                    parentHostObject.put("parentserverdeleted", Boolean.parseBoolean(model.getValueAt(i, 7).toString()));
                    parentHostObject.put("parentservername", (model.getValueAt(i, 8).toString()));
                    if (model.getValueAt(i, 4) != null) {
                        parentHostObject.put("backupfiltertime", (model.getValueAt(i, 4).toString()));
                    } else {
                        parentHostObject.put("backupfiltertime", "");
                    }
                }

            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
        return parentHostObject;

    }

    public static boolean isServerExists(Long destHostId) {
        boolean retval = false;
        try {
            DataObject dob = CommonUtil.getPersistenceLite().get(TableName.RMP_VSPHERE_DETAILS, new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"), destHostId, QueryConstants.EQUAL));
            if (!dob.isEmpty()) {
                Row row = dob.getFirstRow(TableName.RMP_VSPHERE_DETAILS);
                retval = !(boolean) row.get("IS_DELETED");
            }
        } catch (DataAccessException ex) {
            ex.printStackTrace();
        }
        return retval;

    }

    
    public static void updateVMCount(long serverId)
    {
        try
        {
            int totalVMs =0;
            SelectQuery selectQry = new SelectQueryImpl(Table.getTable(TableName.RMP_VSPHERE_DETAILS));
            selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "VSPHERE_HOST_ID"));
            selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"));
            selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "VM_COUNT"));
            selectQry.addSelectColumn(new Column(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"));
            
            Criteria criteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
            Criteria criteria2 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
            Criteria criteria3 = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "CONFIGURATIONSTATUS"), 1, QueryConstants.EQUAL);
            criteria2  = combineCriteria(criteria2,criteria3);
            selectQry.setCriteria(combineCriteria(criteria,criteria2));
            DataObject dataObject = CommonUtil.getPersistenceLite().get(selectQry);
            Iterator itr = dataObject.getRows(TableName.RMP_VSPHERE_DETAILS);
            
            while(itr.hasNext())
            {
                Row row = (Row) itr.next();
                totalVMs = totalVMs + Integer.parseInt(row.get("VM_COUNT").toString());
            }
            
            Criteria cr1 = new Criteria(Column.getColumn(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_ID"), serverId, QueryConstants.EQUAL);
            DataObject dataObj = CommonUtil.getPersistence().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr1);
            Row updaterow = dataObj.getRow(TableName.RMP_VIRTUAL_SERVER_DETAILS);
            updaterow.set("VM_COUNT", totalVMs);
            
            dataObj.updateRow(updaterow);
            CommonUtil.getPersistence().update(dataObj);
        }
        catch(Exception ex)
        {
            ex.printStackTrace();
        }
    }
    
    
    
    public static JSONObject updateMETracker(int virtualEnvironment) {
        JSONObject returnObject = new JSONObject();
        try {
            JSONArray serverArray = getVMServerDetails(new JSONArray(), 0, 1, true,virtualEnvironment).getJSONArray("servers");
            returnObject.put("no_of_servers", serverArray.length());
            int vcenterCount = 0;
            int starSupported = 0;
            int licensedHosts = 0;
            int unconfiguredHosts =0;
            int dcs = 0;
            int vapps = 0;
            int clusters = 0;

            for (int i = 0; i < serverArray.length(); i++) {
                JSONObject serverObject = serverArray.getJSONObject(i);

                if (serverObject.get("type").toString().equalsIgnoreCase("1")) {
                    vcenterCount++;
                }

            }
            returnObject.put("vcenters", vcenterCount);
            
            Criteria virtualCriteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VIRTUAL_ENVIRONMENT"), virtualEnvironment, QueryConstants.EQUAL);
            Criteria isDeletedCriteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);

            DataObject dob = CommonUtil.getPersistenceLite().get(TableName.RMP_VM_DETAILS, combineCriteria(isDeletedCriteria, virtualCriteria));
            if (dob.isEmpty()) {
                returnObject.put("vms", 0);
                returnObject.put("star_vms", 0);
            } else {

                Iterator iterator = dob.getRows(TableName.RMP_VM_DETAILS);
                while (iterator.hasNext()) {

                    Row vmRow = (Row) iterator.next();

                    if (Boolean.parseBoolean(vmRow.get("IS_STAR_SUPPORTED").toString())) {
                        starSupported++;
                    }
                }
                returnObject.put("vms", dob.size(TableName.RMP_VM_DETAILS));
                returnObject.put("star_vms", starSupported);

            }

            virtualCriteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "VIRTUAL_ENVIRONMENT"), virtualEnvironment, QueryConstants.EQUAL);
            isDeletedCriteria = new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
            dob = CommonUtil.getPersistenceLite().get(TableName.RMP_VSPHERE_DETAILS, combineCriteria(isDeletedCriteria, virtualCriteria));

            if (dob.isEmpty()) {
                returnObject.put("hosts", 0);
                returnObject.put("unconfigured_hosts", 0);
                returnObject.put("licensed_hosts", 0);
            } else {

                Iterator iterator = dob.getRows(TableName.RMP_VSPHERE_DETAILS);
                while (iterator.hasNext()) {

                    Row vsphereRow = (Row) iterator.next();

                    if (Boolean.parseBoolean(vsphereRow.get("IS_LICENSED").toString())) {
                        licensedHosts++;
                    }
                    if (Integer.parseInt(vsphereRow.get("CONFIGURATIONSTATUS").toString()) != VirtualConstants.STATUS_CONFIGURED) {
                        unconfiguredHosts++;
                    }
                }
                returnObject.put("hosts", dob.size(TableName.RMP_VSPHERE_DETAILS));
                returnObject.put("unconfigured_hosts", unconfiguredHosts);
                returnObject.put("licensed_hosts", licensedHosts);
            }

            returnObject.put("license_subscribed", LicenseUtil.licenseSubscription());

            if(virtualEnvironment == VirtualConstants.VMWARE) //these parameters are not available for Hyper-V environment
            {
                dob = CommonUtil.getPersistenceLite().get(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS, (Criteria) null);

                if (dob.isEmpty()) {
                    returnObject.put("datacenter", 0);
                    returnObject.put("cluster", 0);
                    returnObject.put("vApp", 0);
                } else {

                    Iterator iterator = dob.getRows(TableName.RMP_VIRTUAL_ENVIRONMENT_DETAILS);
                    while (iterator.hasNext()) {

                        Row envRow = (Row) iterator.next();
                        dcs = dcs + Integer.parseInt(envRow.get("DC_COUNT").toString());
                        vapps = vapps + Integer.parseInt(envRow.get("VAPP_COUNT").toString());
                        clusters = clusters + Integer.parseInt(envRow.get("CLUSTER_COUNT").toString());
                    }
                    returnObject.put("datacenter", dcs);
                    returnObject.put("cluster", clusters);
                    returnObject.put("vApp", vapps);
                }
            }
            else
            {
                returnObject.put("datacenter", 0);
                returnObject.put("cluster", 0);
                returnObject.put("vApp", 0);
            }
            

        } catch (Exception e) {
            e.printStackTrace();
        }
        return returnObject;
    }

}
//ignoreI18n_end
