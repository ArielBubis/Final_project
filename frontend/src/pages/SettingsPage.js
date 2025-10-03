import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Switch, Select, Button, message, Divider } from 'antd';
import { UserOutlined, GlobalOutlined, BellOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import styles from '../styles/modules/Settings.module.css';

const { Option } = Select;

const SettingsPage = () => {
    const { currentUser } = useAuth();
    const { language, toggleLanguage, t } = useLanguage();
    const [userProfile, setUserProfile] = useState({});
    const [settings, setSettings] = useState({
        notifications: true,
        emailNotifications: true,
        dataRefreshInterval: 30,
        theme: 'light',
        autoRefresh: true,
        showRiskAlerts: true
    });

    useEffect(() => {
        loadUserProfile();
    }, [currentUser]);

    const loadUserProfile = async () => {
        if (!currentUser?.uid) return;
        
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const teacherDoc = await getDoc(doc(db, "teachers", currentUser.uid));
            
            let profileData = {};
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                profileData = { ...profileData, ...userData };
            }
            
            if (teacherDoc.exists()) {
                const teacherData = teacherDoc.data();
                profileData = { ...profileData, ...teacherData };
                // Use teacher name as display name if available
                if (teacherData.name) {
                    profileData.displayName = teacherData.name;
                }
            }
            
            setUserProfile(profileData);
            
            // Load user settings if they exist
            const settingsDoc = await getDoc(doc(db, "userSettings", currentUser.uid));
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            message.error('Failed to load user profile');
        }
    };

    const handleSettingsUpdate = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        
        try {
            // Use setDoc with merge to create document if it doesn't exist
            await setDoc(doc(db, "userSettings", currentUser.uid), {
                ...newSettings,
                updatedAt: new Date()
            }, { merge: true });
            message.success('Settings updated');
        } catch (error) {
            console.error('Error updating settings:', error);
            message.error('Failed to update settings');
        }
    };

    return (
        <div className={styles.settingsContainer}>
            <div className={styles.settingsHeader}>
                <h1 className={styles.title}>{t("Settings", "Settings")}</h1>
                <p className={styles.subtitle}>
                    {t("Settings", "Manage your account settings and preferences")}
                </p>
            </div>

            <div className={styles.settingsContent}>
                <Row gutter={[24, 24]}>
                    {/* Profile Settings */}
                    <Col xs={24} lg={12}>
                        <Card 
                            title={
                                <span>
                                    <UserOutlined /> {t("Settings", "Profile Information")}
                                </span>
                            }
                            className={styles.settingsCard}
                        >
                            <div className={styles.profileDisplay}>
                                <div className={styles.infoItem}>
                                    <strong>{t("Settings", "Display Name")}:</strong>
                                    <span>{userProfile.displayName || userProfile.name || 'Not set'}</span>
                                </div>
                                
                                <div className={styles.infoItem}>
                                    <strong>{t("Settings", "Email")}:</strong>
                                    <span>{userProfile.email || currentUser?.email || 'Not available'}</span>
                                </div>
                                
                                <div className={styles.infoItem}>
                                    <strong>{t("Settings", "Department")}:</strong>
                                    <span>{userProfile.department || 'Not set'}</span>
                                </div>
                                
                                <div className={styles.infoItem}>
                                    <strong>{t("Settings", "Title")}:</strong>
                                    <span>{userProfile.title || 'Not set'}</span>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* Application Settings */}
                    <Col xs={24} lg={12}>
                        <Card 
                            title={
                                <span>
                                    <EyeOutlined /> {t("Settings", "Application Preferences")}
                                </span>
                            }
                            className={styles.settingsCard}
                        >
                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <GlobalOutlined />
                                    <span>{t("Settings", "Language")}</span>
                                </div>
                                <Select
                                    value={language}
                                    onChange={toggleLanguage}
                                    style={{ width: 120 }}
                                >
                                    <Option value="EN">English</Option>
                                    <Option value="HE">עברית</Option>
                                </Select>
                            </div>

                            <Divider />

                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <BellOutlined />
                                    <span>{t("Settings", "Enable Notifications")}</span>
                                </div>
                                <Switch
                                    checked={settings.notifications}
                                    onChange={(checked) => handleSettingsUpdate('notifications', checked)}
                                />
                            </div>

                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <span>{t("Settings", "Email Notifications")}</span>
                                </div>
                                <Switch
                                    checked={settings.emailNotifications}
                                    onChange={(checked) => handleSettingsUpdate('emailNotifications', checked)}
                                    disabled={!settings.notifications}
                                />
                            </div>

                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <span>{t("Settings", "Show Risk Alerts")}</span>
                                </div>
                                <Switch
                                    checked={settings.showRiskAlerts}
                                    onChange={(checked) => handleSettingsUpdate('showRiskAlerts', checked)}
                                />
                            </div>

                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <span>{t("Settings", "Auto Refresh Data")}</span>
                                </div>
                                <Switch
                                    checked={settings.autoRefresh}
                                    onChange={(checked) => handleSettingsUpdate('autoRefresh', checked)}
                                />
                            </div>

                            <div className={styles.settingItem}>
                                <div className={styles.settingLabel}>
                                    <span>{t("Settings", "Data Refresh Interval (seconds)")}</span>
                                </div>
                                <Select
                                    value={settings.dataRefreshInterval}
                                    onChange={(value) => handleSettingsUpdate('dataRefreshInterval', value)}
                                    style={{ width: 120 }}
                                    disabled={!settings.autoRefresh}
                                >
                                    <Option value={15}>15s</Option>
                                    <Option value={30}>30s</Option>
                                    <Option value={60}>1m</Option>
                                    <Option value={300}>5m</Option>
                                </Select>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* System Information */}
                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    <Col xs={24}>
                        <Card 
                            title={t("Settings", "System Information")}
                            className={styles.settingsCard}
                        >
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={8}>
                                    <div className={styles.infoItem}>
                                        <strong>{t("Settings", "User ID")}:</strong>
                                        <span>{currentUser?.uid}</span>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div className={styles.infoItem}>
                                        <strong>{t("Settings", "Account Created")}:</strong>
                                        <span>{new Date(currentUser?.metadata?.creationTime).toLocaleDateString()}</span>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div className={styles.infoItem}>
                                        <strong>{t("Settings", "Last Login")}:</strong>
                                        <span>{new Date(currentUser?.metadata?.lastSignInTime).toLocaleDateString()}</span>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default SettingsPage;