import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import BudgetTracker from '../../components/BudgetTracker';
import { fetchAllCategories } from '../../lib/APIs/CategoryApiSupabase';
import { useGlobalContext } from '../../context/GlobalProvider';
import useAlertContext from '../../context/AlertProvider';

export default function Budget() {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { userdetails } = useGlobalContext();
    const { showAlert } = useAlertContext();

    useEffect(() => {
        const fetchCategories = async () => {
            if (!userdetails?.id) return;

            try {
                setIsLoading(true);
                const categoriesData = await fetchAllCategories(userdetails.id);
                setCategories(categoriesData);
            } catch (error) {
                showAlert('Error', 'Failed to load categories', 'error');
                console.error('Error fetching categories:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [userdetails?.id]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-pink-900">
                <ActivityIndicator size="large" color="#a5b4fc" />
            </View>
        );
    }

    return <BudgetTracker categories={categories} />;
}
