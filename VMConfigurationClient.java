package com.manageengine.rmp.virtual.configuration;

import com.adventnet.ds.query.Column;
import com.adventnet.ds.query.Criteria;
import com.adventnet.ds.query.QueryConstants;
import com.adventnet.persistence.DataObject;
import com.adventnet.persistence.Row;
import com.manageengine.ads.fw.license.LicenseManager;
import com.manageengine.ads.fw.util.CommonUtil;
import com.manageengine.rmp.common.LogWriter;
import com.manageengine.rmp.constants.ErrorCode;
import com.manageengine.rmp.constants.RmpConstants;
import com.manageengine.rmp.constants.TableName;
import com.manageengine.rmp.licensing.EditionType;
import com.manageengine.rmp.licensing.LicenseUtil;

import static com.manageengine.rmp.licensing.LicenseUtil.getSubscriptionType;

import com.manageengine.rmp.virtual.VMOperations;
import com.manageengine.rmp.virtual.flowhandler.schedule.BackupCollector;
import com.manageengine.rmp.virtual.flowhandler.vm.VirtualMachineRevertThread;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.io.*;

import org.apache.struts.action.ActionForm;
import org.apache.struts.action.ActionForward;
import org.apache.struts.action.ActionMapping;
import org.apache.struts.actions.DispatchAction;
import org.json.JSONArray;
import org.json.JSONObject;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.ws.soap.SOAPFaultException;
import com.manageengine.rmp.virtual.HVNativeHandler;
import com.manageengine.rmp.jni.RMPNativeManager;
import com.manageengine.rmp.virtual.VirtualConstants;
import com.manageengine.rmp.virtual.VirtualMachineUtil;
import java.util.HashMap;

/**
 * Created by ebin-4354 on 8/23/2016.
 */
// ignoreI18n_start
public class VMConfigurationClient extends DispatchAction {

	public ActionForward addNewServer(ActionMapping mapping, ActionForm form, HttpServletRequest request, HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.addNewServer()");
		VMOperations vmOp = null;
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(request.getParameter("req"));// No I18N
			JSONObject newServerDetails = (JSONObject) inputJSONObject.get("serverdetails");// No I18N
			String userName = URLDecoder.decode(newServerDetails.get("username").toString(), "UTF-8");// No I18N
			String fullName = URLDecoder.decode(newServerDetails.get("fullName").toString(), "UTF-8");// No I18N
			LogWriter.virtual.info("Inside" + "VMConfigurationClient.addNewServer()  FULL_NAME "+fullName );
			String password = URLDecoder.decode(newServerDetails.get("password").toString(), "UTF-8");// No I18N
			String serverName = URLDecoder.decode(newServerDetails.get("servername").toString(), "UTF-8");// No I18N
			
			Integer port = Integer.parseInt(newServerDetails.get("port").toString());// No I18N
			Boolean isScvmmChildHost = Boolean.parseBoolean(newServerDetails.get("isScvmmChildHost").toString());//No I18N
			int virtualEnvironment = newServerDetails.getInt("virtualEnvironment");// No I18N
			String connectionType = newServerDetails.get("connectionType").toString();// No I18N
			int isScvmm = 2;//standalone
			if((virtualEnvironment == VirtualConstants.HYPERV) && connectionType.equals("SCVMM"))
			{
				isScvmm = 1;//scvmm
			}
			LogWriter.virtual.info("API called: " + "VMConfigurationClient.addNewServer(). Details: virtualEnvironment -> " + virtualEnvironment + "serverName-> "+serverName + "connectionType->"+connectionType+"isScvmm->"+isScvmm);
			
            int count = 0;

           if(virtualEnvironment == VirtualConstants.VMWARE)
           {
                Criteria cr2 = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), serverName, QueryConstants.EQUAL);
			     Criteria cr1 = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
                 count = CommonUtil.getPersistenceLite().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr2.and(cr1)).size(TableName.RMP_VIRTUAL_SERVER_DETAILS);
            }
            else if(virtualEnvironment == VirtualConstants.HYPERV)
           {
            if((connectionType.equals("Standalone")) || isScvmmChildHost)  //Standalone Hyper-v server
            {
                LogWriter.virtual.info("Checking if standalone already present...");//No I18N
                Criteria cr2 = new Criteria(new Column(TableName.RMP_VSPHERE_DETAILS, "HOST_NAME"), serverName, QueryConstants.EQUAL);
                 Criteria cr1 = new Criteria(new Column(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
                 cr1=cr1.and(new Criteria(new Column(TableName.RMP_VSPHERE_DETAILS, "CONFIGURATIONSTATUS"), 1, QueryConstants.EQUAL));
                 count = CommonUtil.getPersistenceLite().get(TableName.RMP_VSPHERE_DETAILS, cr2.and(cr1)).size(TableName.RMP_VSPHERE_DETAILS);
                
            }
            else 
            {
                LogWriter.virtual.info("Checking if SCVMM already present...");//No I18N
                 Criteria cr2 = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "SERVER_NAME"), serverName, QueryConstants.EQUAL);
                 Criteria cr1 = new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "IS_DELETED"), false, QueryConstants.EQUAL);
                 cr1=cr1.and(new Criteria(new Column(TableName.RMP_VIRTUAL_SERVER_DETAILS, "HOST_TYPE"), 1L, QueryConstants.EQUAL));
                 count = CommonUtil.getPersistenceLite().get(TableName.RMP_VIRTUAL_SERVER_DETAILS, cr2.and(cr1)).size(TableName.RMP_VIRTUAL_SERVER_DETAILS);
            }
            }            
			
			if (count > 0) {

				retval.put("errorCode", ErrorCode.SERVER_ALREADY_PRESENT.getId());
				retval.put("errorMsg", ErrorCode.SERVER_ALREADY_PRESENT.getMsg());

			} else {

				ErrorCode errorCode = null;

				if(virtualEnvironment == VirtualConstants.HYPERV)
				{  
					if((connectionType.equals("Standalone")) || isScvmmChildHost)  //Standalone Hyper-v server
					{
						JSONObject hypervServerDetails;
                                                                                                          if(isScvmmChildHost)
                                                                                                          {
                                                                                                              //updating status as configuring for streaming
                                                                                                              HVConfigurationServer.updateHyperVServerStatus(newServerDetails.getLong("hostid"), VirtualConstants.STATUS_CONFIGURING, null,  URLDecoder.decode(newServerDetails.get("username").toString(), "UTF-8"));
                                                                                                          }
						hypervServerDetails = HVConfigurationServer.getStandaloneHypervHostandVMDetails(userName, password, serverName);




						String isSuccessful = hypervServerDetails.getString("isSuccessful");// No I18N   
						if(isSuccessful.equals("true"))
						{
							String osVersion = hypervServerDetails.getJSONArray("vmDetails").getJSONObject(0).getString("osVersion");// No I18N
							if(osVersion.startsWith("10"))
							{
								//Agent installation failed
								retval.put("errorCode", ErrorCode.UNSUPPORTED_HOST.getId());
								retval.put("errorMsg", ErrorCode.UNSUPPORTED_HOST.getMsg());
							}
							else
							{
								//no error.
								//push agent
								int agentStatus = HVConfigurationServer.pushHypervagent(userName, password, serverName, true);
								//int agentStatus=0;//hardcoded for UI
								if(agentStatus!=0)
								{
									//Agent installation failed
									retval.put("errorCode", ErrorCode.BACKUP_AGENT_INSTALLATION_FAILED.getId());
									retval.put("errorMsg", ErrorCode.BACKUP_AGENT_INSTALLATION_FAILED.getMsg());
								}
								else
								{
									//installandstartHypervdriver
									String domain, user;
									if(userName!=null && !userName.equalsIgnoreCase("-"))
									{
										String[] parts = userName.split("\\\\"); //No I18N
										domain = parts[0];
										user = parts[1];
									}
									else
									{
										domain="-";
										user="-";
									}
									String hostServername = "\\\\" + serverName;
									String isInstall="true";
									int driverStatus = HVNativeHandler.jNIinstallandstartHypervdriver(domain, user, password, hostServername, isInstall);
									//int driverStatus = 0; // hardcoded for UI
									if(driverStatus!=0 && driverStatus!=259)
									{
										//error
										retval.put("errorCode", ErrorCode.CBT_SETUP_FAILED.getId());
										retval.put("errorMsg", ErrorCode.CBT_SETUP_FAILED.getMsg());
									}
									else
									{
										int vmCount = hypervServerDetails.getInt("vmCount");// No I18N 
										vmCount-=2; //1 for host vm and 1 for host details  
										newServerDetails.put("vmcount", vmCount);// No I18N 
										JSONArray hvVMDetails = hypervServerDetails.getJSONArray("vmDetails");// No I18N
										newServerDetails.put("hvvmDetails", hvVMDetails);// No I18N
										newServerDetails.put("servertype", isScvmm); 
										retval = HVConfigurationServer.addHyperVServer(newServerDetails, isScvmmChildHost);
									}
								}
							}
							}   
							else
							{
								//some error. fill retVal
								retval.put("errorCode", ErrorCode.CONNECTION_FAILED.getId());
								retval.put("errorMsg", ErrorCode.CONNECTION_FAILED.getMsg());
							}
                                                                                                                if(isScvmmChildHost && retval.has("errorCode"))
                                                                                                                {
                                                                                                                    //updating status as failed for streaming
                                                                                                                    HVConfigurationServer.updateHyperVServerStatus(newServerDetails.getLong("hostid"), VirtualConstants.STATUS_FAILED, retval.getString("errorMsg"), URLDecoder.decode(newServerDetails.getString("username"), "UTF-8"));
                                                                                                                }
					}
					else if((connectionType.equals("SCVMM")) && (!isScvmmChildHost))//SCVMM Hyper-V server
					{
						retval = HVConfigurationServer.getScvmmHosts(serverName, userName, password);  

					}
				}



				else if(virtualEnvironment == VirtualConstants.VMWARE)
				{
					//VMConnection.trustAll();
					URL hostURL = null;
					try {
						hostURL = new URL("https://" + serverName + ":" + port + "/sdk");// No I18N
					} catch (MalformedURLException ex) {
						Logger.getLogger(BackupCollector.class.getName()).log(Level.SEVERE, null, ex);
					}
					try {
						vmOp = new VMOperations(hostURL, userName, password);
					} catch (NullPointerException e) {
						vmOp = null;
						errorCode = ErrorCode.CONNECTION_FAILED;
						e.printStackTrace();
					} catch (com.vmware.vim25.InvalidLoginFaultMsg ex) {
						vmOp = null;
						errorCode = ErrorCode.AUTHENTICATION_FAILED;
						ex.printStackTrace();
					} catch (SOAPFaultException e) {
						errorCode = ErrorCode.LOCKDOWN_MODE;
						e.printStackTrace();
						vmOp = null;
					} catch (Exception e) {
						errorCode = ErrorCode.CONNECTION_FAILED;
						e.printStackTrace();
						vmOp = null;
					}

					if (vmOp != null) {
						JSONObject validatedDetails = vmOp.getStructureInfo();

						if (validatedDetails.has("error")) {

							if (Integer.parseInt(validatedDetails.get("error").toString()) == 1) {
								retval.put("errorCode", ErrorCode.VCENTER_ALREADY_PRESENT.getId());
								retval.put("errorMsg", ErrorCode.VCENTER_ALREADY_PRESENT.getMsg());
							} else if (Integer.parseInt(validatedDetails.get("error").toString()) == 3) {
								retval.put("errorCode", ErrorCode.UNSUPPORTED_HOST.getId());
								retval.put("errorMsg", ErrorCode.UNSUPPORTED_HOST.getMsg());
							} else if (Integer.parseInt(validatedDetails.get("error").toString()) == 4) {
                                retval.put("errorCode", ErrorCode.UNSUPPORTED_HOST_VCENTER_32.getId());
                                retval.put("errorMsg", ErrorCode.UNSUPPORTED_HOST_VCENTER_32.getMsg());
                            }  else {
								retval.put("errorCode", ErrorCode.CONNECTION_FAILED.getId());
								retval.put("errorMsg", ErrorCode.CONNECTION_FAILED.getMsg());

							}

						} else {

							JSONObject serverObject = validatedDetails.getJSONObject("serverinfo");// No I18N
							String serverType = serverObject.get("type").toString();// No I18N

							if (serverType.equalsIgnoreCase("HostAgent")) {
								newServerDetails.put("servertype", 2);//ESX
							} else {
								newServerDetails.put("servertype", 1);

							}
							newServerDetails.put("vmcount", Integer.parseInt(serverObject.get("vmcount").toString()));// No I18N
							newServerDetails.put("vspherearray", serverObject.getJSONArray("vspherearray"));// No I18N
							newServerDetails.put("datacentercount", Long.parseLong(serverObject.get("datacentercount").toString()));
							newServerDetails.put("virtualappcount", Long.parseLong(serverObject.get("virtualappcount").toString()));
							newServerDetails.put("clustercount", Long.parseLong(serverObject.get("clustercount").toString()));
							
							//newServerDetails.put("fullName", fullName);
							
							retval = VMConfigurationServer.addVMServer(newServerDetails);

						}

					} else {
						retval.put("errorCode", errorCode.getId());
						retval.put("errorMsg", errorCode.getMsg());
					}

				}
			}
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			LogWriter.virtual.info("Inside finally" + "VMConfigurationClient.addNewServer()  FULL_NAME " );
			String str = "I am an Indian";
			try{			FileOutputStream fos = new FileOutputStream("C:\\Users\\raji-5434\\Desktop\\xyz.txt");
			
			byte[] bytes = str.getBytes();
			fos.write(bytes);
		    fos.close();
			}
			catch(Exception e){
				LogWriter.virtual.info("Inside finally" + "VMConfigurationClient.addNewServer()  Exception occured while creating the file" );
			}
			if (vmOp != null) {
				vmOp.closeConnection();
			}

		}

		return null;
	}

	public ActionForward refreshServerDetails(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) { // implement the whole chain
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.refreshServerDetails()");
		try {

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			JSONArray serverDetails = inputJSONObject.getJSONArray("serverdetails");//No i18n

			// Entire JsonObject is sent to refreshServerDetails method to distinguish environment and server type
                                                    JSONArray vmWareServerIds = new JSONArray();
                                                    HashMap<Long,String> hypervServerIds = new HashMap<Long,String>();
                                                    
                                                    for (int i = 0; i < serverDetails.length(); i++) 
                                                    {
                                                        VMConfigurationServer.updateServerStatus(serverDetails.getJSONObject(i));//Update Status of each server
            
                                                        String type = serverDetails.getJSONObject(i).getString("type");// No I18N
                                                        int virtualEnvironment = serverDetails.getJSONObject(i).getInt("virtualEnvironment");// No I18N
                                                        Long serverid = serverDetails.getJSONObject(i).getLong("serverid");// No I18N
                                                        if(virtualEnvironment == VirtualConstants.VMWARE){
                                                            if (type.equalsIgnoreCase("2") ) {
                                                                vmWareServerIds.put(VMConfigurationServer.getParentServer(serverDetails.getJSONObject(i).getLong("serverid")).get("serverid"));
                                                            } else {
                                                                vmWareServerIds.put(serverid);
                                                            }
                                                        }
                                                        else
                                                        {
                                                            hypervServerIds.put(serverid, type);
                                                        }
                                                     }
                                                    
                                                    JSONObject validatedDetails = new JSONObject();
                                                    if(vmWareServerIds.length() >0){
                                                        validatedDetails = VMConfigurationServer.refreshServerDetails(vmWareServerIds);// Refresh
                                                    }
                        
                                                    if(hypervServerIds.size() > 0){
                                                        validatedDetails = HVConfigurationServer.refreshHyperVdetailsHelper(hypervServerIds);// Refresh
                                                    }
			JSONObject retval = new JSONObject();
			if (validatedDetails.has("errorCode")) {
				retval = validatedDetails;
			} else if (validatedDetails.has("error")) {

				if (Integer.parseInt(validatedDetails.get("error").toString()) == 1) {
					retval.put("errorCode", ErrorCode.VCENTER_ALREADY_PRESENT.getId());
					retval.put("errorMsg", ErrorCode.VCENTER_ALREADY_PRESENT.getMsg());
				} else {
					retval.put("errorCode", ErrorCode.CONNECTION_FAILED.getId());
					retval.put("errorMsg", ErrorCode.CONNECTION_FAILED.getMsg());
				}

			} else {
				retval.put("status", true);
			}

			resp.getWriter().print(retval.toString());
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward enableDisableServer(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.enableDisableServer()");
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);
			// TestClass.testFunction();
			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			long serverId = Long.parseLong(inputJSONObject.get("serverid").toString());// No I18N
			int servertype = Integer.parseInt(inputJSONObject.get("servertype").toString());// No I18N
			retval = VMConfigurationServer.enableDisableServer(serverId, servertype);

			resp.getWriter().print(retval.toString());
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward getScvmmHostDetails(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(request.getParameter("req"));//No i18n

			retval = HVConfigurationServer.getHostsForSCVMM(inputJSONObject.getLong("serverid"), inputJSONObject.getBoolean("isconfiguredonly"));//No i18n
			if (retval == null) {
				retval.put("errorcode", ErrorCode.DB_READ_FAILED.getId());
				retval.put("errormsg", ErrorCode.DB_READ_FAILED.getMsg());
			}
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward getServers(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.getServers()");
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			JSONArray serverIdArray = inputJSONObject.getJSONArray("serverids");
			int virtualEnvironment = -1;// intialize to retrieve all
			if (inputJSONObject.has("virtualEnvironment")) {
				virtualEnvironment = inputJSONObject.getInt("virtualEnvironment");//No i18n
			}
			// call to edit server
			if (Integer.parseInt(inputJSONObject.get("limit").toString()) == 1 && Integer.parseInt(inputJSONObject.get("rangestart").toString()) == 1 && serverIdArray.length() == 1) {
				if (Integer.parseInt(inputJSONObject.get("servertype").toString()) == 2) {
					JSONObject serverObject = VMConfigurationServer.getParentServer(Long.parseLong(serverIdArray.get(0).toString())); //first vspherehostid
					serverIdArray = new JSONArray();
					serverIdArray.put(Long.parseLong(serverObject.get("serverid").toString()));
				}
			}
			JSONObject serverDetails = VMConfigurationServer.getVMServerDetails(serverIdArray, Integer.parseInt(inputJSONObject.get("limit").toString()), Integer.parseInt(inputJSONObject.get("rangestart").toString()), false, virtualEnvironment);// No I18N
			// if free license applied performs reframe license
			if (serverDetails.getJSONArray("servers").length() > 0) {
				LicenseUtil.checkAndUpdateLicense();
			}
			if (serverDetails != null) {
				retval.put("serverdetails", serverDetails);

			} else {
				retval.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
				retval.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
			}
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward updateServer(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.updateServer()");
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(request.getParameter("req"));//No i18n
			JSONObject serverDetails = (JSONObject) inputJSONObject.get("changedserverdetails");

			int virtualEnvironment = serverDetails.getInt("virtualEnvironment");//No i18n
			if (virtualEnvironment == VirtualConstants.VMWARE) {
				retval = VMConfigurationServer.userUpdateVMServer(serverDetails);
			} else if (virtualEnvironment == VirtualConstants.HYPERV) {
				retval = HVConfigurationServer.userUpdateHVVMServer(serverDetails);
			}

			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward getVMList(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.getVMList()");
		try {
			JSONObject retval = new JSONObject();

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(request.getParameter("req"));//No i18n
                        
			String operationtype = inputJSONObject.get("operationtype").toString();// No I18N
                                                    if (operationtype.equalsIgnoreCase("search")) {
                                                        inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
                                                    }
                        
                                                    JSONObject serverDetails = (JSONObject) inputJSONObject.get("serverdetails");//No i18n
			Boolean listAll = Boolean.parseBoolean(serverDetails.get("listAll").toString());// No I18N
			int rangeStart = 1;
			int limit = 1;
			if (!listAll) {
				rangeStart = Integer.parseInt(serverDetails.get("rangestart").toString());// No I18N
				limit = Integer.parseInt(serverDetails.get("limit").toString());// No I18N
			}

			Criteria criteria = null;

			if (operationtype.equalsIgnoreCase("search")) {
				String searchString = inputJSONObject.get("searchstring").toString();// No I18N
				criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_NAME"), searchString,
						QueryConstants.LIKE, false);
			}

			if (inputJSONObject.has("includeunlicensedhosts")) {
				if (!Boolean.parseBoolean(inputJSONObject.get("includeunlicensedhosts").toString())) {
					criteria = VMConfigurationServer.combineCriteria(criteria,
							new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_LICENSED"), true,
									QueryConstants.EQUAL));
				}
			}

			JSONObject retObject = VMConfigurationServer.getVMList(serverDetails, criteria, rangeStart, limit, listAll);
			JSONArray vmsList = null;
			long vmCount = 0L;
                                                    if(retObject.has("errorCode"))
                                                    {
                                                        retval.put("errorCode", retObject.getInt("errorCode"));
                                                        retval.put("errorMsg", retObject.getString("errorMsg"));
                                                        retval.put("vmcount", 0);
                                                        retval.put("vmarray", new JSONArray("[]"));
                                                    }
                                                    else
                                                    {
                                                        if (retObject != null) {
				vmsList = retObject.getJSONArray("vmarray");// No I18N
				vmCount = Long.parseLong(retObject.get("vmcount").toString());// No I18N
                                                        }
                                                        if (vmsList != null) {
				retval.put("vms", vmsList);
				retval.put("vmcount", vmCount);

                                                        } else {
				retval.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
				retval.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
                                                        }
                                                    }
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward deleteServer(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.deleteServer()");
		try {
			JSONObject retval = new JSONObject();
			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			int virtualEnvironment = inputJSONObject.getInt("virtualEnvironment");//No i18n

			if (virtualEnvironment == VirtualConstants.HYPERV) {
				retval = HVConfigurationServer.deleteHyperVServer(inputJSONObject.getLong("serverid"),//No i18n
						inputJSONObject.get("servertype").toString());// No I18N
			} else if (virtualEnvironment == VirtualConstants.VMWARE) {
				retval = VMConfigurationServer.deleteServer(Long.parseLong(inputJSONObject.get("serverid").toString()), inputJSONObject.get("servertype").toString());// No I18N
			}

			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward populateServerDropdown(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.populateServerDropdown()");
		try {

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			JSONObject retval = new JSONObject();
			String requestPage = inputJSONObject.get("requestpage").toString(); // Because in Configuration Page we need to show all Hosts Irrespective of license status
			int virtualEnvironment = -1;// intialize to retrieve all
			if (inputJSONObject.has("virtualEnvironment")) {
				virtualEnvironment = inputJSONObject.getInt("virtualEnvironment");//No i18n
				// I18N
			}
			JSONObject serverDetails = VMConfigurationServer.getVMServerDetails(new JSONArray(), 1, 1, true,
					virtualEnvironment);

			JSONArray spanArray = new JSONArray();

			if (serverDetails != null) {
				JSONArray serverList = serverDetails.getJSONArray("servers");// No I18N

				for (int i = 0; i < serverList.length(); i++) {

					boolean isDisabled = Boolean.parseBoolean(serverList.getJSONObject(i).get("isdisabled").toString());// No I18N
					boolean isServerLicensed = Boolean.parseBoolean(serverList.getJSONObject(i).get("islicensed").toString());// No I18N
					int cpuSockets = Integer.parseInt(serverList.getJSONObject(i).get("cpusockets").toString());// No I18N
					String environment = serverList.getJSONObject(i).get("virtualEnvironment").toString();// No I18N

					// if (isDeleted) {
					// continue;
					// }
					if (requestPage.equalsIgnoreCase("vbackup") || requestPage.equalsIgnoreCase("vrestore")) {

						if (!isServerLicensed || isDisabled) {
							continue;
						}

					}

					JSONObject eachServerJSONObject = new JSONObject();

					int type = Integer.parseInt(serverList.getJSONObject(i).get("type").toString());// No I18N
					long serverId = Long.parseLong(serverList.getJSONObject(i).get("serverid").toString());// No I18N
					String serverName = serverList.getJSONObject(i).get("servername").toString();// No I18N

					eachServerJSONObject.put("type", type);
					eachServerJSONObject.put("value", serverName);

					JSONArray vsphereArray = VMConfigurationServer.getVspheres(serverId);

					if (type == 1) {

						eachServerJSONObject.put("id", "topid" + serverId);
						eachServerJSONObject.put("category", "true");// No I18N
						JSONArray subdata = new JSONArray();
						if (vsphereArray != null) {
							for (int j = 0; j < vsphereArray.length(); j++) {

								JSONObject eachvsphereJSONObject = new JSONObject();

								long vsphereId = Long.parseLong(vsphereArray.getJSONObject(j).get("vsphereid").toString());// No I18N
								String hostName = vsphereArray.getJSONObject(j).get("hostname").toString();// No I18N
								Boolean isVsphereLicensed = Boolean.parseBoolean(vsphereArray.getJSONObject(j).get("islicensed").toString());// No I18N
								int vcpuSockets = Integer.parseInt(vsphereArray.getJSONObject(j).get("cpusockets").toString());// No I18N
								String venvironment = VirtualMachineUtil.convertVirtualConstantToName(Integer.parseInt(vsphereArray.getJSONObject(j).getString("virtualEnvironment")));// No I18N
								int isVsphereConfigured = vsphereArray.getJSONObject(j).getInt("configurationstatus");// No I18N

								if (virtualEnvironment == VirtualConstants.HYPERV) { // chvonfigured hosts should be shown also in conficuration screen in hyper-v
									if (requestPage.equalsIgnoreCase("vbackup")
											|| requestPage.equalsIgnoreCase("vrestore")
											|| requestPage.equalsIgnoreCase("vconfiguration")) {
										if (!isVsphereLicensed) {
											continue;
										}
									}
								} else {
									if (requestPage.equalsIgnoreCase("vbackup")
											|| requestPage.equalsIgnoreCase("vrestore")) {
										if (!isVsphereLicensed) {
											continue;
										}
									}
								}

								eachvsphereJSONObject.put("id", "subid" + vsphereId);
								eachvsphereJSONObject.put("subname", hostName);
								eachvsphereJSONObject.put("type", "2");// No I18N
								eachvsphereJSONObject.put("islicensed", isVsphereLicensed);// No I18N
								eachvsphereJSONObject.put("cpusockets", vcpuSockets);// No I18N
								eachvsphereJSONObject.put("virtualEnvironment", venvironment);// No I18N

								subdata.put(eachvsphereJSONObject);
							}

							eachServerJSONObject.put("subdata", subdata);
						} else {
							retval.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
							retval.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
						}
					} else {
						eachServerJSONObject.put("id", "subid" + serverId);
						eachServerJSONObject.put("islicensed", isServerLicensed);// No I18N
						eachServerJSONObject.put("cpusockets", cpuSockets);// No I18N
						eachServerJSONObject.put("virtualEnvironment", environment);// No I18N
					}
					spanArray.put(eachServerJSONObject);
				}

				retval.put("spandata", spanArray);
			} else {
				retval.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
				retval.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
			}
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward populateVirtualEnvironmentDropdown(ActionMapping mapping, ActionForm form,
			HttpServletRequest request, HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.populateEnvironmentDropdown()");
		try {
			JSONObject retval = new JSONObject();
                        
                                                     JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			String requestPage = inputJSONObject.get("requestpage").toString(); // Because

			resp.setContentType(RmpConstants.CONTENT_TYPE);

			retval = VirtualMachineUtil.getVirtualEnvironments(requestPage);// No I18N

			if (retval == null) {
				retval.put("errorCode", ErrorCode.DB_READ_FAILED.getId());
				retval.put("errorMsg", ErrorCode.DB_READ_FAILED.getMsg());
			}
			resp.getWriter().print(retval.toString());

		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward applyLicense(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.applyLicense()");
		try {
			JSONObject retval = new JSONObject();
			resp.setContentType(RmpConstants.CONTENT_TYPE);
			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			Boolean isSave = (Boolean) inputJSONObject.get("isSave");
			if (isSave) {
				ArrayList<Long> newHostList = new ArrayList<Long>();
				JSONArray jArray = (JSONArray) inputJSONObject.get("newHostList");
				if (jArray != null) {
					for (int i = 0; i < jArray.length(); i++) {
						newHostList.add(Long.parseLong(jArray.get(i).toString()));
					}
				}
				boolean isRemoveBackups = Boolean.parseBoolean(inputJSONObject.get("isRemoveBackups").toString());// No I18N
				LicenseHandler.applyLicense(newHostList, isRemoveBackups);
			}
			LicenseHandler.updateIsVMConfigured();
			retval.put("isSuccess", true);
			resp.getWriter().print(retval.toString());
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	public ActionForward getLicensedHosts(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.getLicensedHosts()");
		int numberOfHosts = 0;
		JSONObject retval = new JSONObject();
		try {
			retval = new JSONObject();
			JSONObject componentDetails = LicenseManager.getComponentDetails();
			String numberOfHostString = componentDetails.has("VSPHEREHOSTS") ? new JSONObject((componentDetails.get("VSPHEREHOSTS").toString())).get("NumberOfHosts").toString() : (getSubscriptionType(LicenseManager.getLicenseDetails()) == EditionType.Free.ordinal()) ? "0" : "1";// for info icon in license management popup
			if (!componentDetails.has("VSPHEREHOSTS")
					&& !(getSubscriptionType(LicenseManager.getLicenseDetails()) == EditionType.Free.ordinal())) {
				retval.put("showInfo", true);
			}
			if (numberOfHostString.equalsIgnoreCase("unlimited")) {
				numberOfHosts = -1;
			} else {
				numberOfHosts = Integer.parseInt(numberOfHostString);
			}

			retval.put("NumberOfHosts", numberOfHosts);
			resp.getWriter().print(retval.toString());
		} catch (Exception e) {
			e.printStackTrace();
			try {
				retval.put("NumberOfHosts", numberOfHosts);
				resp.getWriter().print(retval.toString());
			} catch (Exception ex) {
				ex.printStackTrace();
			}
		}
		return null;
	}

	public ActionForward checkIsLicensed(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.checkIsLicensed()");
		try {
			JSONObject retval = new JSONObject();
			retval = new JSONObject();
			Integer licenseSubscription = LicenseUtil.licenseSubscription();
	            if (licenseSubscription == -1) {//Unlimited License
	                licenseSubscription = Integer.MAX_VALUE;
	            }
	            boolean needLicensePopup = (licenseSubscription - LicenseUtil.getHostUsage(false)) > 0; // User has more subscription available
	            needLicensePopup = (needLicensePopup & (LicenseUtil.getHostUsage(true) > LicenseUtil.getHostUsage(false)));//User has unlicensed Hosts

			Criteria cr1 = new Criteria(Column.getColumn(TableName.RMP_SYSTEM_PARAMS, "PARAM_NAME"), "IS_VM_CONFIGURED",
					QueryConstants.EQUAL);
			DataObject obj = CommonUtil.getPersistence().get(TableName.RMP_SYSTEM_PARAMS, cr1);
			Iterator iter = obj.getRows("SystemParams");
			if (iter.hasNext()) {
				Row row = (Row) iter.next();
				if (row.get("PARAM_VALUE").toString().equalsIgnoreCase("false")) {
					needLicensePopup = true;
				}
			}
			retval.put("status", needLicensePopup);
			resp.getWriter().print(retval.toString());
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	public ActionForward fetchTopVMs(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.fetchTopVMs()");
		try {
			resp.setContentType(RmpConstants.CONTENT_TYPE);
			resp.getWriter().print(VMConfigurationServer.getTopVMs(true));// get
			// upto
			// 5
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward fetchAllBackedupVMs(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.fetchTopVMs()");
		try {
			resp.setContentType(RmpConstants.CONTENT_TYPE);
			resp.getWriter().print(VMConfigurationServer.getTopVMs(false));// get upto 5
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward fetchAllVMs(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.fetchTopVMs()");
		try {
			resp.setContentType(RmpConstants.CONTENT_TYPE);
			resp.getWriter().print(VMConfigurationServer.getAllVMs((Criteria) null));
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward fetchNotBackedupVMs(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.fetchTopVMs()");
		try {
			Criteria criteria = null;
			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONArray vmArray = VMConfigurationServer.getTopVMIDList(new ArrayList());

			ArrayList vmIdList = new ArrayList();

			if (vmArray.length() > 0) {

				for (int i = 0; i < vmArray.length(); i++) {
					vmIdList.add(Long.parseLong(vmArray.getJSONObject(i).get("vmid").toString()));
				}
			}
			criteria = new Criteria(Column.getColumn(TableName.RMP_VM_DETAILS, "VM_ID"), vmIdList.toArray(new Long[0]),
					QueryConstants.NOT_IN);
			criteria = criteria.and(new Criteria(Column.getColumn(TableName.RMP_VSPHERE_DETAILS, "IS_DELETED"), false,
					QueryConstants.EQUAL));
			resp.getWriter().print(VMConfigurationServer.getAllVMs(criteria));
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward getVMUsage(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.getVMUsage()");
		try {
			resp.setContentType(RmpConstants.CONTENT_TYPE);

			JSONObject inputJSONObject = new JSONObject(URLDecoder.decode(request.getParameter("req"), "UTF-8"));//No i18n
			resp.getWriter().print(VMConfigurationServer.getVMUsage(Long.parseLong(inputJSONObject.get("vmid").toString())).toString());
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

	public ActionForward getParentHost(ActionMapping mapping, ActionForm form, HttpServletRequest request, HttpServletResponse resp) {
	
	        LogWriter.virtual.info("API called: " + "VMConfigurationClient.getParentHost()");
	        try {
	            JSONObject retval = new JSONObject();
	            JSONObject inputJSONObject = new JSONObject(request.getParameter("req"));// No I18N
	            resp.setContentType(RmpConstants.CONTENT_TYPE);
	            retval = VMConfigurationServer.getParentHost(0L, Long.parseLong(inputJSONObject.get("vmid").toString()));// No I18N
	            resp.getWriter().print(retval.toString());
	
	        } catch (Exception e) {
	            e.printStackTrace();
	        }
	
	        return null;
	
	    }

	public ActionForward getDashboardData(ActionMapping mapping, ActionForm form, HttpServletRequest request,
			HttpServletResponse resp) {
		LogWriter.virtual.info("API called: " + "VMConfigurationClient.getDashboardData()");
		try {
			resp.setContentType(RmpConstants.CONTENT_TYPE);

			resp.getWriter().print(VMConfigurationServer.getDashboardData());
		} catch (Exception e) {
			e.printStackTrace();
		}

		return null;
	}

   

}
// ignoreI18n_end
