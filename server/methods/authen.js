/**
 * Created by thana on 9/9/2016.
 */
//import soap  from 'soap';

Meteor.methods({
    'account.authenticate'(username, password) {
        check(username, String);
        check(password, String);

        // If this is the first user to login, generate a dummy data and make him admin
        if (Meteor.users.find().count() === 0 && Meteor.settings.public.createDummyAdmin) {
            try {
                const dummyPassword = Meteor.settings.public.dummyPassword;
                _createDummyAdmin(username, dummyPassword);
                return `User ${username} is successfully created with a dummy password ${dummyPassword} and made admin`;
            } catch(error) {
                throw new Meteor.Error('500', error);
            }
        }
        // If username and password is the same as first user to login, bypass the Thaicom authentication
        // The purpose is to let us continue developing the app while the Thaicom authen access is not arrived
        // (waiting reply from MIS, etc.)
        else if (Meteor.users.findOne({ username: username, firstUser: true }) && Meteor.settings.public.bypassAuthenForFirstUser) {
            return 'Authentication success';
        }

        // Otherwise, authenticate with Thaicom employee database server
        // Promise pattern is used here to synchronously call the authentication method on Soap Server
        // And wait an authentication result before return it to the client
        // If Promise is not used, the return will invoke first before the result from authentication server
        // comes back to our application
        return _authenticateWithCompanyDatabase(username, password).then((employeeProfile) => {
            console.log(employeeProfile);
            _.extend(employeeProfile, { username });
            _insertOrUpdateEmployeeDataInOurApplication(employeeProfile);

            return 'Authentication success';
        }).catch((error) => {
            console.log('Error message = ' + error);
            throw new Meteor.Error('500', error);
        });
    }
});

// Create a dummy admin from the given username and password
let _createDummyAdmin = (username, password) => {
    let dummyAdmin = Meteor.settings.private.dummyAdmin;
    _.extend(dummyAdmin, { username, password, firstUser: true });
    //console.log(`Creating dummy admin with details: ${JSON.stringify(dummyAdmin)}`);
    const newAdmin =  _createUser(dummyAdmin);

    // Add admin roles to this user
    Roles.addUsersToRoles(newAdmin, 'admin', Roles.GLOBAL_GROUP);
};

// Return an employee object if user/pass is correct, otherwise return error message
let _authenticateWithCompanyDatabase = (username, password) => {

    // The Promise is used here to make asynchronous method call (soap client) can be called synchronously
    return new Promise((resolve, reject) => {
        const url = 'https://thcom2.thaicom.net/authservice/AuthenticationSystem.asmx?wsdl';

        // Be careful on this argument assignment. If the arguments does not match what OAuth server requires,
        // (parameter names) it will throw an Object reference.. error
        let loginArguments = {
            param: Meteor.settings.private.thaicomOauth,
        };
        _.extend(loginArguments.param, { UserName: username, Password: password });

        // Create Soap Client
        var soap = Npm.require('soap');
        soap.createClient(url, function(err, client) {
            client.GetAuthen(loginArguments, function(error, result) {
                if (error) {
                    reject(error);
                }
                const authenResult = result.GetAuthenResult;
                console.log(authenResult.IsSuccess);
                if (authenResult.IsSuccess) {
                    resolve(authenResult.EmpProfile);
                } else {
                    reject(authenResult.Message);
                }
            });
        });
    });
};

// Insert the employee profile into our application if it's the his/her first time login
// Otherwise, update employee data in our application because sometimes our company re-organization happens
let _insertOrUpdateEmployeeDataInOurApplication = (profile) => {
    let employeeProfile = {
        username: profile.username,
        bu: profile.Bu,
        dp: profile.Dp,
        email: profile.Email,
        gender: profile.Gender,
        firstName: profile.FirstName,
        lastName: profile.LastName,
        position: profile.Position,
        image:  profile.Image,
    };

    // If this user does not exist in our database, insert this user with a dummy password
    // Our application will not store the real password in our database
    // The correct method to do this is MIS should provide the full OAuth system and we use the OAuth library
    // Unfortunately, that's not the option and we need to use account:password with a dummy password in our
    // system and use the MIS authentication server call as a logic gate instead of the real login system
    if (!Meteor.users.findOne({ username: employeeProfile.username })){
        const dummyPassword = Meteor.settings.public.dummyPassword;
        employeeProfile.password = dummyPassword;
        let newUser = _createUser(employeeProfile);

        // If this is the first user to login, give that user admin
        if (Meteor.users.find().count() === 0) {
            // Add admin roles to this user
            Roles.addUsersToRoles(newUser, 'admin', Roles.GLOBAL_GROUP);
        }

        // If this user is DP-CS or DP-CNS, gives admin role
        if (employeeProfile.dp === 'DP-CS' || employeeProfile.dp === 'DP-CNS') {
            // Add admin roles to this user
            Roles.addUsersToRoles(newUser, 'admin', Roles.GLOBAL_GROUP);
        }

    }
    // Otherwise, update our database with new employee profile. This means every time a user logs in
    // His/her data in our application will be refreshed. (yes, re-organization happens)
    else {
        Meteor.users.update({ username: employeeProfile.username }, { $set: employeeProfile });
    }

};

// Create a real user for everyone except the first user to login
let _createUser = (user) => {
    //console.log(`Creating user: ${user.username}`);
    // Account.onCreateUser hook in accounts.js file is required to include other info such as name, lastname
    // into Meteor.users database
    return Accounts.createUser(user);
};

